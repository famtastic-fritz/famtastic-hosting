/**
 * GET /api/customer/domains
 *
 * Returns the customer's domains from GoDaddy.
 *
 * MVP NOTE: GoDaddy's /v1/customers and /v1/shoppers/self endpoints
 * return 401/403 with sso-key auth. We cannot filter domains to a specific
 * customer via the GoDaddy API at this tier. For MVP, we return all domains
 * in the reseller account, and the UI displays them to any authenticated user.
 * Post-MVP: implement shopper-level GoDaddy auth to filter per-customer.
 *
 * Query parameters:
 *   statuses  - comma-separated status filter (default: ACTIVE,PENDING_DNS_ACTIVE)
 *   limit     - max records (default 100)
 *   skipCache - set to "true" to bypass cache
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth/middleware.js';
import { listDomains } from '../../../lib/godaddy/domains.js';
import { apiOk, apiError, handleGoDaddyError } from '../../../lib/api/response.js';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  // Require customer (or admin) auth
  const authResult = await requireAuth(context.request);
  if (authResult instanceof Response) return authResult;

  const url = new URL(context.request.url);
  const statusesParam = url.searchParams.get('statuses');
  const limit = parseInt(url.searchParams.get('limit') ?? '100', 10);
  const skipCache = url.searchParams.get('skipCache') === 'true';

  try {
    const domains = await listDomains({
      statuses: statusesParam ? statusesParam.split(',') : undefined,
      limit: isNaN(limit) ? 100 : Math.min(limit, 1000),
      skipCache,
    });

    // Annotate each domain with a "days until expiry" convenience field
    const now = Date.now();
    const annotated = domains.map((d) => {
      const expiresMs = d.expires ? new Date(d.expires).getTime() : null;
      const daysUntilExpiry = expiresMs
        ? Math.ceil((expiresMs - now) / (1000 * 60 * 60 * 24))
        : null;
      const expiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
      const expired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

      return {
        domain: d.domain,
        domainId: d.domainId,
        status: d.status,
        expires: d.expires,
        renewAuto: d.renewAuto,
        nameServers: d.nameServers ?? [],
        daysUntilExpiry,
        expiringSoon,
        expired,
      };
    });

    return apiOk({ domains: annotated, total: annotated.length });
  } catch (err) {
    return handleGoDaddyError(err);
  }
};
