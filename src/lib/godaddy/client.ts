/**
 * GoDaddy Reseller API — Base Client
 *
 * SERVER-SIDE ONLY. Never import this from client-side code.
 * GoDaddy API keys are read from import.meta.env and must NEVER reach the browser.
 *
 * Auth format: "sso-key APIKEY:APISECRET"  (PLAINTEXT — NOT base64, NOT Basic, NOT sBasic)
 */

import type { GoDaddyAPIError } from './types.js';
import { GoDaddyError } from './types.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = 'https://api.godaddy.com/v1';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 300;

// ─── In-Memory Cache ──────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class TTLCache {
  private store = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { data: value, expiresAt: Date.now() + ttlMs });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

export const cache = new TTLCache();

export const CACHE_TTL = {
  PRODUCTS: 5 * 60 * 1000,   // 5 minutes — product catalog changes rarely
  DOMAINS: 60 * 1000,         // 1 minute — domain list
  DOMAIN_DETAIL: 60 * 1000,   // 1 minute — single domain
  DNS: 30 * 1000,             // 30 seconds — DNS records
  ORDERS: 2 * 60 * 1000,     // 2 minutes — order history
  AVAILABILITY: 5 * 60 * 1000, // 5 minutes — domain availability checks
} as const;

// ─── Auth Header Builder ──────────────────────────────────────────────────────

/**
 * Builds the GoDaddy sso-key authorization header.
 * Format: "sso-key APIKEY:APISECRET" — PLAINTEXT, not base64.
 * Never call this from client-side code.
 */
export function buildAuthHeader(): string {
  // Astro server-side: import.meta.env is available
  // We access it here; callers are responsible for only calling this server-side
  const key = import.meta.env.GODADDY_API_KEY;
  const secret = import.meta.env.GODADDY_API_SECRET;

  if (!key || !secret) {
    throw new GoDaddyError(
      'GoDaddy API credentials not configured. Set GODADDY_API_KEY and GODADDY_API_SECRET in your .env file.',
      500,
      'MISSING_CREDENTIALS',
      false
    );
  }

  // CRITICAL: This is PLAINTEXT sso-key format, not base64-encoded Basic auth.
  return `sso-key ${key}:${secret}`;
}

function getBaseUrl(): string {
  return import.meta.env.GODADDY_API_BASE ?? DEFAULT_BASE_URL;
}

// ─── Error Normalization ──────────────────────────────────────────────────────

const GODADDY_ERROR_MESSAGES: Record<string, string> = {
  UNABLE_TO_AUTHENTICATE: 'Authentication failed. Check your GoDaddy API credentials.',
  UNABLE_TO_AUTHORIZE: 'Your API key does not have permission for this operation.',
  TOO_MANY_REQUESTS: 'GoDaddy API rate limit reached. Please wait before retrying.',
  DUPLICATE_DOMAIN: 'This domain already exists in the account.',
  DOMAIN_NOT_FOUND: 'Domain not found in this account.',
  ORDER_NOT_FOUND: 'Order not found.',
  SHOPPER_NOT_FOUND: 'Shopper account not found.',
  ALREADY_ACTIVATED: 'This service is already active.',
  INTERNAL_SERVER_ERROR: 'GoDaddy is experiencing issues. Please try again later.',
};

function normalizeErrorMessage(code: string, fallback: string): string {
  return GODADDY_ERROR_MESSAGES[code] ?? fallback;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

// ─── Fetch Wrapper ────────────────────────────────────────────────────────────

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  skipCache?: boolean;
  cacheTTL?: number;
  cacheKey?: string;
}

/**
 * Core fetch wrapper with:
 * - Automatic sso-key auth header injection
 * - 10s timeout
 * - Exponential backoff retry (3 attempts) for transient errors
 * - Rate limit handling (429 → wait for Retry-After then retry)
 * - Error normalization to GoDaddyError
 * - In-memory caching for GET requests
 */
export async function godaddyFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    skipCache = false,
    cacheTTL,
    cacheKey,
  } = options;

  const fullUrl = `${getBaseUrl()}${path}`;
  const resolvedCacheKey = cacheKey ?? `${method}:${fullUrl}`;

  // Check cache for GET requests
  if (method === 'GET' && !skipCache) {
    const cached = cache.get<T>(resolvedCacheKey);
    if (cached !== null) return cached;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      await sleep(backoff);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const headers: Record<string, string> = {
        Authorization: buildAuthHeader(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body !== undefined) {
        fetchOptions.body = JSON.stringify(body);
      }

      let response: Response;
      try {
        response = await fetch(fullUrl, fetchOptions);
      } finally {
        clearTimeout(timeoutId);
      }

      // Handle rate limiting: 429 with Retry-After header
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await sleep(waitMs);
        lastError = new GoDaddyError('Rate limit exceeded', 429, 'TOO_MANY_REQUESTS', true);
        continue;
      }

      // Handle success (204 No Content)
      if (response.status === 204) {
        const result = undefined as unknown as T;
        return result;
      }

      // Parse response body
      let responseBody: unknown;
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }

      // Handle error responses
      if (!response.ok) {
        const errBody = responseBody as Partial<GoDaddyAPIError>;
        const code = errBody?.code ?? 'UNKNOWN_ERROR';
        const message = normalizeErrorMessage(
          code,
          errBody?.message ?? `GoDaddy API error ${response.status}`
        );

        const err = new GoDaddyError(
          message,
          response.status,
          code,
          isRetryableStatus(response.status),
          errBody?.fields
        );

        if (!err.retryable) throw err;
        lastError = err;
        continue;
      }

      // Success — cache GET responses
      const result = responseBody as T;
      if (method === 'GET' && !skipCache && cacheTTL !== undefined) {
        cache.set(resolvedCacheKey, result, cacheTTL);
      }

      return result;
    } catch (err) {
      if (err instanceof GoDaddyError && !err.retryable) throw err;

      // AbortError = timeout
      if (err instanceof Error && err.name === 'AbortError') {
        lastError = new GoDaddyError(
          'GoDaddy API request timed out after 10 seconds.',
          408,
          'REQUEST_TIMEOUT',
          true
        );
        continue;
      }

      if (err instanceof Error) {
        lastError = err;
        continue;
      }

      throw err;
    }
  }

  throw lastError ?? new GoDaddyError('GoDaddy API request failed after retries.', 500, 'MAX_RETRIES_EXCEEDED', false);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
