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
import { requireAdminAuth, unauthorizedResponse } from '../../../lib/auth/middleware.js';
import { apiOk, handleGoDaddyError } from '../../../lib/api/response.js';

// This route is server-rendered (not prerendered)
export const prerender = false;

export const GET: APIRoute = async (context) => {
  // Require admin auth — full domain list is admin-only
  const session = await requireAdminAuth(context);
  if (!session) return unauthorizedResponse('Admin authentication required.');

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
