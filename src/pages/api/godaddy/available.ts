/**
 * GET /api/godaddy/available?domain=example.com
 *
 * Proxy endpoint: checks domain availability and returns pricing via GoDaddy.
 * This endpoint is PUBLIC — customers can check domain availability without
 * being logged in. Auth is NOT required here.
 *
 * Query parameters:
 *   domain    - the domain to check (required, e.g. "example.com")
 *   bulk      - comma-separated list of additional TLDs to check
 *               (e.g. "example.net,example.org")
 *   skipCache - set to "true" to bypass 5-minute cache
 *
 * Example responses:
 *   Available:   { ok: true, data: { domain: "...", available: true, priceUSD: 20.00, ... } }
 *   Unavailable: { ok: true, data: { domain: "...", available: false } }
 *   Error:       { ok: false, error: "...", code: "..." }
 */

import type { APIRoute } from 'astro';
import { checkAvailability, checkAvailabilityBulk } from '../../../lib/godaddy/domains.js';
import { apiOk, apiError, handleGoDaddyError } from '../../../lib/api/response.js';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const url = new URL(context.request.url);
  const domain = url.searchParams.get('domain')?.trim().toLowerCase();
  const bulkParam = url.searchParams.get('bulk')?.trim();
  const skipCache = url.searchParams.get('skipCache') === 'true';

  if (!domain) {
    return apiError(
      'domain query parameter is required (e.g. ?domain=example.com)',
      'MISSING_PARAM',
      400
    );
  }

  // Basic domain format validation — prevent obviously invalid queries
  if (!/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\.[a-z]{2,}$/.test(domain)) {
    return apiError(
      'Invalid domain format. Provide a full domain with TLD (e.g. example.com).',
      'INVALID_DOMAIN',
      400
    );
  }

  try {
    if (bulkParam) {
      // Bulk check: primary domain + additional variants
      const additionalDomains = bulkParam.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
      const allDomains = [domain, ...additionalDomains];
      const results = await checkAvailabilityBulk(allDomains, skipCache);
      return apiOk(results);
    }

    // Single domain check
    const result = await checkAvailability(domain, skipCache);
    return apiOk(result);
  } catch (err) {
    return handleGoDaddyError(err);
  }
};
