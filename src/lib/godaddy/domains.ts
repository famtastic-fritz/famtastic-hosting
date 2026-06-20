/**
 * GoDaddy Domain Management
 * SERVER-SIDE ONLY — all calls go through the base client.
 *
 * Endpoints:
 *   GET /v1/domains              → list all domains
 *   GET /v1/domains/{domain}     → domain detail
 *   GET /v1/domains/available    → availability check + pricing
 */

import { godaddyFetch, CACHE_TTL, cache } from './client.js';
import type {
  GoDaddyDomain,
  DomainAvailabilityResult,
  DomainAvailabilityResponse,
} from './types.js';
import { microToUSD } from './types.js';

// ─── List Domains ─────────────────────────────────────────────────────────────

export interface ListDomainsOptions {
  /** Filter by status */
  statuses?: string[];
  /** Filter by status group */
  statusGroups?: string[];
  /** Pagination offset */
  offset?: number;
  /** Page size (default 100, max 1000) */
  limit?: number;
  /** Sort direction */
  sort?: string;
  /** Include related domains */
  includes?: string[];
  /** Skip cache */
  skipCache?: boolean;
}

/**
 * List all domains in the reseller account.
 * Results are cached for 1 minute to avoid hammering the API on every page load.
 */
export async function listDomains(options: ListDomainsOptions = {}): Promise<GoDaddyDomain[]> {
  const {
    statuses,
    statusGroups,
    offset,
    limit = 100,
    sort,
    includes,
    skipCache = false,
  } = options;

  const params = new URLSearchParams();
  if (statuses?.length) params.set('statuses', statuses.join(','));
  if (statusGroups?.length) params.set('statusGroups', statusGroups.join(','));
  if (offset !== undefined) params.set('offset', String(offset));
  params.set('limit', String(limit));
  if (sort) params.set('sort', sort);
  if (includes?.length) params.set('includes', includes.join(','));

  const qs = params.toString();
  const path = `/domains${qs ? `?${qs}` : ''}`;
  const cacheKey = `GET:domains:list:${qs}`;

  return godaddyFetch<GoDaddyDomain[]>(path, {
    skipCache,
    cacheTTL: CACHE_TTL.DOMAINS,
    cacheKey,
  });
}

// ─── Get Single Domain ────────────────────────────────────────────────────────

/**
 * Fetch details for a specific domain.
 * Includes DNS, nameservers, contacts, and renewal info.
 */
export async function getDomain(
  domain: string,
  skipCache = false
): Promise<GoDaddyDomain> {
  const cacheKey = `GET:domains:detail:${domain}`;

  return godaddyFetch<GoDaddyDomain>(`/domains/${encodeURIComponent(domain)}`, {
    skipCache,
    cacheTTL: CACHE_TTL.DOMAIN_DETAIL,
    cacheKey,
  });
}

// ─── Check Domain Availability ─────────────────────────────────────────────────

/**
 * Check whether a domain is available for registration.
 * Returns availability status and pricing (in USD).
 *
 * NOTE: GoDaddy returns price in MICRODOLLARS — this function normalizes to USD.
 */
export async function checkAvailability(
  domain: string,
  skipCache = false
): Promise<DomainAvailabilityResult> {
  const cacheKey = `GET:domains:available:${domain}`;

  const params = new URLSearchParams({ domain });
  const raw = await godaddyFetch<DomainAvailabilityResponse>(
    `/domains/available?${params.toString()}`,
    {
      skipCache,
      cacheTTL: CACHE_TTL.AVAILABILITY,
      cacheKey,
    }
  );

  return {
    domain: raw.domain,
    available: raw.available,
    definitive: raw.definitive,
    currency: raw.currency,
    price: raw.price,                          // raw MICRODOLLARS (kept for debugging)
    priceUSD: raw.price ? microToUSD(raw.price) : undefined,
    period: raw.period,
    periodUnit: raw.periodUnit,
  };
}

// ─── Bulk Availability Check ──────────────────────────────────────────────────

/**
 * Check availability for multiple domains in a single call.
 * Useful for TLD sweeps (e.g., checking .com/.net/.org for a given name).
 */
export async function checkAvailabilityBulk(
  domains: string[],
  skipCache = false
): Promise<DomainAvailabilityResult[]> {
  if (!domains.length) return [];

  // GoDaddy bulk availability — POST /v1/domains/available
  // Swagger returns an object shape: { domains: [...], errors?: [...] }
  const raw = await godaddyFetch<{ domains?: DomainAvailabilityResponse[] } | DomainAvailabilityResponse[]>(
    '/domains/available',
    {
      method: 'POST',
      body: domains,
      skipCache,
    }
  );

  const items = Array.isArray(raw) ? raw : Array.isArray(raw?.domains) ? raw.domains : [];

  return items.map((item) => ({
    domain: item.domain,
    available: item.available,
    definitive: item.definitive,
    currency: item.currency,
    price: item.price,
    priceUSD: item.price ? microToUSD(item.price) : undefined,
    period: item.period,
    periodUnit: item.periodUnit,
  }));
}

// ─── Cache Helpers ────────────────────────────────────────────────────────────

/** Invalidate the cached domain list (call after any mutation). */
export function invalidateDomainListCache(): void {
  cache.invalidatePrefix('GET:domains:list:');
}

/** Invalidate the cached detail for a specific domain. */
export function invalidateDomainCache(domain: string): void {
  cache.invalidate(`GET:domains:detail:${domain}`);
}
