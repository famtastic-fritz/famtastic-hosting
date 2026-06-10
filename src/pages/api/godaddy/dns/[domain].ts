/**
 * GET  /api/godaddy/dns/[domain]  — Read DNS records for a domain
 * PUT  /api/godaddy/dns/[domain]  — Set/replace a DNS record
 *
 * Requires admin authentication.
 *
 * GET query parameters:
 *   type      - Filter by DNS record type (A, CNAME, MX, TXT, ...)
 *   skipCache - set to "true" to bypass 30-second cache
 *
 * PUT body (JSON):
 *   {
 *     type: "A" | "CNAME" | "MX" | "TXT" | ...
 *     name: "@" | "www" | "mail" | ...
 *     value: "1.2.3.4" | "example.com." | ...
 *     ttl?: number       (seconds, min 600, default 3600)
 *     priority?: number  (MX/SRV records)
 *   }
 */

import type { APIRoute } from 'astro';
import {
  getDNSRecords,
  getDNSRecordsByType,
  setDNSRecord,
} from '../../../../lib/godaddy/dns.js';
import type { DNSRecordType } from '../../../../lib/godaddy/types.js';
import { requireAdmin } from '../../../../lib/auth/middleware.js';

export const prerender = false;

// Helper: return 401 Unauthorized
function unauthorizedResponse(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Helper: return error response
function apiError(message: string, code: string, status = 400) {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Helper: return success response
function apiOk(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Helper: handle GoDaddy errors
function handleGoDaddyError(error: any) {
  console.error('GoDaddy API error:', error);
  return apiError(
    error?.message || 'GoDaddy API request failed',
    'GODADDY_ERROR',
    500
  );
}

// ─── GET: Read DNS records ────────────────────────────────────────────────────

export const GET: APIRoute = async (context) => {
  const authResult = await requireAdmin(context.request);
  if (authResult instanceof Response) return authResult;
  const session = authResult;

  const domain = context.params.domain;
  if (!domain) return apiError('Domain name is required.', 'MISSING_PARAM', 400);

  const url = new URL(context.request.url);
  const type = url.searchParams.get('type') as DNSRecordType | null;
  const skipCache = url.searchParams.get('skipCache') === 'true';

  try {
    const records = type
      ? await getDNSRecordsByType(domain, type, skipCache)
      : await getDNSRecords(domain, skipCache);

    return apiOk(records);
  } catch (err) {
    return handleGoDaddyError(err);
  }
};

// ─── PUT: Set/replace a DNS record ───────────────────────────────────────────

export const PUT: APIRoute = async (context) => {
  const authResult = await requireAdmin(context.request);
  if (authResult instanceof Response) return authResult;
  const session = authResult;

  const domain = context.params.domain;
  if (!domain) return apiError('Domain name is required.', 'MISSING_PARAM', 400);

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return apiError('Invalid JSON body.', 'INVALID_JSON', 400);
  }

  const payload = body as Record<string, unknown>;

  const type = payload.type as DNSRecordType | undefined;
  const name = payload.name as string | undefined;
  const value = payload.value as string | undefined;
  const ttl = typeof payload.ttl === 'number' ? payload.ttl : 3600;
  const priority = typeof payload.priority === 'number' ? payload.priority : undefined;

  if (!type) return apiError('DNS record type is required (e.g. A, CNAME, MX, TXT).', 'MISSING_FIELD', 400);
  if (!name) return apiError('DNS record name is required (e.g. @, www, mail).', 'MISSING_FIELD', 400);
  if (!value) return apiError('DNS record value is required.', 'MISSING_FIELD', 400);

  const validTypes: DNSRecordType[] = ['A', 'AAAA', 'CAA', 'CNAME', 'MX', 'NS', 'SOA', 'SRV', 'TXT'];
  if (!validTypes.includes(type)) {
    return apiError(`Invalid DNS record type: ${type}. Must be one of: ${validTypes.join(', ')}`, 'INVALID_TYPE', 400);
  }

  if (ttl < 600) {
    return apiError('TTL must be at least 600 seconds.', 'INVALID_TTL', 400);
  }

  try {
    await setDNSRecord(domain, type, name, value, ttl, { priority });
    return apiOk({ success: true, domain, type, name });
  } catch (err) {
    return handleGoDaddyError(err);
  }
};
