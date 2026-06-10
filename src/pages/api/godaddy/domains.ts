/**
 * GET /api/godaddy/domains
 *
 * Proxy endpoint: returns the domain list from the GoDaddy reseller account.
 * Requires admin authentication (only Fritz needs to see the full domain list).
 *
 * Query parameters:
 *   statuses    - comma-separated status filter (ACTIVE,EXPIRED,...)
 *   limit       - max records (default 100)
 *   offset      - pagination offset
 *   skipCache   - set to "true" to bypass cache
 */

import type { APIRoute } from 'astro';
import { listDomains } from '../../../lib/godaddy/domains.js';
import { requireAdmin } from '../../../lib/auth/middleware.js';

// Helper: return 401 Unauthorized
function unauthorizedResponse(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
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
  return new Response(JSON.stringify({ error: error?.message || 'GoDaddy API request failed', code: 'GODADDY_ERROR' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

// This route is server-rendered (not prerendered)
export const prerender = false;

export const GET: APIRoute = async (context) => {
  // Require admin auth — full domain list is admin-only
  const authResult = await requireAdmin(context.request);
  if (authResult instanceof Response) return authResult;
  const session = authResult;

  const url = new URL(context.request.url);
  const statusesParam = url.searchParams.get('statuses');
  const limit = parseInt(url.searchParams.get('limit') ?? '100', 10);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);
  const skipCache = url.searchParams.get('skipCache') === 'true';

  try {
    const domains = await listDomains({
      statuses: statusesParam ? statusesParam.split(',') : undefined,
      limit: isNaN(limit) ? 100 : Math.min(limit, 1000),
      offset: isNaN(offset) ? 0 : offset,
      skipCache,
    });

    return apiOk(domains);
  } catch (err) {
    return handleGoDaddyError(err);
  }
};
