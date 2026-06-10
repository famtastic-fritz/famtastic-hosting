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
import { requireAdminAuth, unauthorizedResponse } from '../../../../lib/auth/middleware.js';
import { apiOk, apiError, handleGoDaddyError } from '../../../../lib/api/response.js';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const session = await requireAdminAuth(context);
  if (!session) return unauthorizedResponse('Admin authentication required.');

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
