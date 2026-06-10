/**
 * GET /api/godaddy/domains/[domain]
 *
 * Proxy endpoint: returns details for a single domain from GoDaddy.
 * Requires admin authentication.
 *
 * Route parameter:
 *   domain - the domain name (e.g., "famtastichosting.com")
 *
 * Query parameters:
 *   skipCache - set to "true" to bypass 1-minute cache
 */

import type { APIRoute } from 'astro';
import { getDomain } from '../../../../lib/godaddy/domains.js';
import { requireAdmin } from '../../../../lib/auth/middleware.js';

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

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const authResult = await requireAdmin(context.request);
  if (authResult instanceof Response) return authResult;
  const session = authResult;

  const domain = context.params.domain;
  if (!domain) return apiError('Domain name is required.', 'MISSING_PARAM', 400);

  const url = new URL(context.request.url);
  const skipCache = url.searchParams.get('skipCache') === 'true';

  try {
    const details = await getDomain(domain, skipCache);
    return apiOk(details);
  } catch (err) {
    return handleGoDaddyError(err);
  }
};
