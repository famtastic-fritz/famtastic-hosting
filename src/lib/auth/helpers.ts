/**
 * Auth helpers — rate limiting, session cookie management.
 *
 * hashRateLimit(ip, action)        — simple in-memory limiter (5 attempts/min)
 * clearRateLimit(ip, action)       — resets the rate limit counter
 * rateLimitResetSeconds(ip, action)— seconds until rate-limit window resets
 * buildSetCookieHeader(data, secure) — writes the fam_session httpOnly cookie
 * buildClearCookieHeader()         — expires the fam_session cookie
 * setSessionCookie(response, data) — appends Set-Cookie header to a Response
 * clearSessionCookie(response)     — appends expiring Set-Cookie header
 * getClientIP(request)             — extracts client IP from proxy headers
 *
 * Cookie format change:
 *   Previously stored { access_token, refresh_token } from Supabase Auth.
 *   Now stores an opaque session token string from the MySQL `sessions` table.
 *   The `SessionData` interface holds { userId, email, role } for building
 *   the response, but only the session token goes into the cookie.
 */

import { SESSION_COOKIE } from './middleware.js';

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  windowStart: number;   // epoch ms
}

/** In-memory store: key = `${ip}:${action}`, value = attempt window */
const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_MAX     = 5;           // max failed attempts
const RATE_LIMIT_WINDOW  = 60_000;      // 1 minute window (ms)

/** Prune stale entries every 5 minutes to prevent memory growth */
let lastPrune = Date.now();

function maybePrune(): void {
  if (Date.now() - lastPrune < 5 * 60_000) return;
  const cutoff = Date.now() - RATE_LIMIT_WINDOW;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.windowStart < cutoff) rateLimitStore.delete(key);
  }
  lastPrune = Date.now();
}

/**
 * Records an attempt and returns whether the caller is rate-limited.
 *
 * Returns true  → caller is blocked (too many attempts in the current window).
 * Returns false → caller is allowed.
 *
 * @param ip     Client IP address (use x-forwarded-for in production)
 * @param action Action identifier, e.g. 'login', 'register', 'admin_login'
 */
export function hashRateLimit(ip: string, action: string): boolean {
  maybePrune();
  const key = `${ip}:${action}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    // New window — reset count
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

/**
 * Clears the rate-limit counter for the given ip+action.
 * Call this on successful auth to reset the window for legitimate users.
 */
export function clearRateLimit(ip: string, action: string): void {
  rateLimitStore.delete(`${ip}:${action}`);
}

/**
 * Returns the remaining seconds until the rate-limit window resets.
 * Returns 0 if not currently rate-limited.
 */
export function rateLimitResetSeconds(ip: string, action: string): number {
  const entry = rateLimitStore.get(`${ip}:${action}`);
  if (!entry) return 0;
  const elapsed = Date.now() - entry.windowStart;
  const remaining = RATE_LIMIT_WINDOW - elapsed;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

// ─── Session data type ───────────────────────────────────────────────────────

/**
 * Simple JSON-serializable user identity. Used by login/signup routes to
 * return user info in the response body. The cookie itself stores only
 * the opaque session token — not this data.
 */
export interface SessionData {
  userId: string;
  email: string;
  role: 'customer' | 'admin';
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

/** 30-day session lifetime (seconds) */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Builds the Set-Cookie header value for the session cookie.
 * The value is the opaque session token (not user data).
 *
 * httpOnly=true  — prevents XSS from reading the token.
 * SameSite=Lax   — protects against CSRF while allowing top-level navigation.
 * Secure         — only sent over HTTPS (set by caller based on env).
 */
export function buildSetCookieHeader(token: string, secure: boolean): string {
  const value = encodeURIComponent(token);

  const parts = [
    `${SESSION_COOKIE}=${value}`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
  ];

  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/**
 * Builds the Set-Cookie header that expires the session cookie immediately.
 */
export function buildClearCookieHeader(): string {
  return [
    `${SESSION_COOKIE}=`,
    `Max-Age=0`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
  ].join('; ');
}

/**
 * Appends the session cookie to a Response (or returns a new Response with
 * the cookie header added).
 *
 * @param response  The Response to annotate
 * @param token     Opaque session token from the `sessions` table
 * @param secure    Pass true in production (HTTPS); false in local dev
 */
export function setSessionCookie(
  response: Response,
  token: string,
  secure = import.meta.env.PROD as boolean
): Response {
  const headers = new Headers(response.headers);
  headers.set('Set-Cookie', buildSetCookieHeader(token, secure));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Returns a new Response identical to the input but with the session cookie
 * cleared (Max-Age=0).
 */
export function clearSessionCookie(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Set-Cookie', buildClearCookieHeader());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ─── IP extraction ────────────────────────────────────────────────────────────

/**
 * Extracts the client IP from standard proxy headers, with a fallback.
 * Use in API routes: const ip = getClientIP(Astro.request);
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '0.0.0.0'
  );
}