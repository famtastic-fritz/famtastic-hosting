/**
 * GoDaddy DNS Management
 * SERVER-SIDE ONLY.
 *
 * Endpoints:
 *   GET /v1/domains/{domain}/records              → all DNS records
 *   GET /v1/domains/{domain}/records/{type}       → records by type
 *   GET /v1/domains/{domain}/records/{type}/{name}→ specific record
 *   PUT /v1/domains/{domain}/records/{type}/{name}→ set/replace record(s)
 *   PATCH /v1/domains/{domain}/records            → update multiple records
 *   DELETE /v1/domains/{domain}/records/{type}/{name} → delete record(s)
 */

import { godaddyFetch, CACHE_TTL, cache } from './client.js';
import type { GoDaddyDNSRecord, DNSRecordType, DNSRecordInput } from './types.js';

// ─── Get DNS Records ──────────────────────────────────────────────────────────

/**
 * Fetch all DNS records for a domain.
 */
export async function getDNSRecords(
  domain: string,
  skipCache = false
): Promise<GoDaddyDNSRecord[]> {
  const cacheKey = `GET:dns:${domain}:all`;

  return godaddyFetch<GoDaddyDNSRecord[]>(
    `/domains/${encodeURIComponent(domain)}/records`,
    {
      skipCache,
      cacheTTL: CACHE_TTL.DNS,
      cacheKey,
    }
  );
}

/**
 * Fetch DNS records filtered by type (A, CNAME, MX, TXT, etc.)
 */
export async function getDNSRecordsByType(
  domain: string,
  type: DNSRecordType,
  skipCache = false
): Promise<GoDaddyDNSRecord[]> {
  const cacheKey = `GET:dns:${domain}:${type}`;

  return godaddyFetch<GoDaddyDNSRecord[]>(
    `/domains/${encodeURIComponent(domain)}/records/${type}`,
    {
      skipCache,
      cacheTTL: CACHE_TTL.DNS,
      cacheKey,
    }
  );
}

/**
 * Fetch a specific DNS record by domain, type, and name.
 * Returns an array because multiple records can share the same type+name (e.g., MX records).
 */
export async function getDNSRecord(
  domain: string,
  type: DNSRecordType,
  name: string,
  skipCache = false
): Promise<GoDaddyDNSRecord[]> {
  const cacheKey = `GET:dns:${domain}:${type}:${name}`;

  return godaddyFetch<GoDaddyDNSRecord[]>(
    `/domains/${encodeURIComponent(domain)}/records/${type}/${encodeURIComponent(name)}`,
    {
      skipCache,
      cacheTTL: CACHE_TTL.DNS,
      cacheKey,
    }
  );
}

// ─── Set DNS Record ───────────────────────────────────────────────────────────

/**
 * Create or replace a DNS record.
 *
 * GoDaddy semantics: PUT replaces ALL records of this type+name.
 * If you want to add without removing existing records of the same type+name,
 * fetch first and include existing records in the body.
 *
 * @param domain  - The domain (e.g., "example.com")
 * @param type    - DNS record type (A, CNAME, MX, TXT, ...)
 * @param name    - Record name (@ for root, subdomain name, or * for wildcard)
 * @param value   - Record value (IP for A, hostname for CNAME, etc.)
 * @param ttl     - Time-to-live in seconds (min 600, default 3600)
 * @param extras  - Additional fields for MX/SRV records (priority, weight, port, etc.)
 */
export async function setDNSRecord(
  domain: string,
  type: DNSRecordType,
  name: string,
  value: string,
  ttl = 3600,
  extras: Partial<DNSRecordInput> = {}
): Promise<void> {
  const record: DNSRecordInput & { data: string; ttl: number } = {
    data: value,
    ttl,
    ...extras,
  };

  await godaddyFetch<void>(
    `/domains/${encodeURIComponent(domain)}/records/${type}/${encodeURIComponent(name)}`,
    {
      method: 'PUT',
      body: [record],  // GoDaddy expects an array for this endpoint
      skipCache: true,
    }
  );

  // Invalidate cached DNS for this domain
  invalidateDNSCache(domain);
}

/**
 * Update multiple DNS records in a single API call (PATCH).
 * Adds or modifies records — does NOT replace all records of a type.
 */
export async function updateDNSRecords(
  domain: string,
  records: GoDaddyDNSRecord[]
): Promise<void> {
  await godaddyFetch<void>(
    `/domains/${encodeURIComponent(domain)}/records`,
    {
      method: 'PATCH',
      body: records,
      skipCache: true,
    }
  );

  invalidateDNSCache(domain);
}

/**
 * Replace ALL DNS records for a domain with the provided set.
 * Use with caution — this is a full replacement.
 */
export async function replaceDNSRecords(
  domain: string,
  records: GoDaddyDNSRecord[]
): Promise<void> {
  await godaddyFetch<void>(
    `/domains/${encodeURIComponent(domain)}/records`,
    {
      method: 'PUT',
      body: records,
      skipCache: true,
    }
  );

  invalidateDNSCache(domain);
}

// ─── Delete DNS Record ────────────────────────────────────────────────────────

/**
 * Delete all DNS records matching the given type and name.
 */
export async function deleteDNSRecord(
  domain: string,
  type: DNSRecordType,
  name: string
): Promise<void> {
  await godaddyFetch<void>(
    `/domains/${encodeURIComponent(domain)}/records/${type}/${encodeURIComponent(name)}`,
    {
      method: 'DELETE',
      skipCache: true,
    }
  );

  invalidateDNSCache(domain);
}

// ─── Nameserver Helpers ───────────────────────────────────────────────────────

/**
 * Convenience: set FAMtastic custom nameservers on a domain.
 * This points the domain at ns1.famtastichosting.com / ns2.famtastichosting.com.
 *
 * NOTE: This updates domain nameservers, not DNS records.
 * This uses the /v1/domains/{domain} PATCH endpoint, not the DNS records endpoint.
 */
export async function setFAMtasticNameservers(domain: string): Promise<void> {
  await godaddyFetch<void>(
    `/domains/${encodeURIComponent(domain)}`,
    {
      method: 'PATCH',
      body: {
        nameServers: [
          'ns1.famtastichosting.com',
          'ns2.famtastichosting.com',
        ],
      },
      skipCache: true,
    }
  );
}

// ─── Cache Helpers ────────────────────────────────────────────────────────────

/** Invalidate all cached DNS records for a domain. */
export function invalidateDNSCache(domain: string): void {
  cache.invalidatePrefix(`GET:dns:${domain}:`);
}
