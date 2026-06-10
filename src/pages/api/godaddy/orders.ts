/**
 * GET /api/godaddy/orders
 *
 * Proxy endpoint: returns order history from GoDaddy.
 * ADMIN ONLY — this data includes revenue, pricing, and customer order details.
 *
 * NOTE: GoDaddy returns all pricing in MICRODOLLARS.
 * This endpoint normalizes to USD before returning to the client.
 * Raw microdollar values are NOT sent to the client.
 *
 * Query parameters:
 *   limit      - max records (default 25, max 10000)
 *   offset     - pagination offset (default 0)
 *   dateStart  - ISO 8601 date filter (e.g. 2026-01-01T00:00:00Z)
 *   dateEnd    - ISO 8601 date filter (e.g. 2026-12-31T23:59:59Z)
 *   domain     - filter by domain name
 *   normalize  - set to "false" to return raw GoDaddy order data (admin debugging only)
 *   skipCache  - set to "true" to bypass 2-minute cache
 *   stats      - set to "true" to return revenue stats instead of order list
 */

import type { APIRoute } from 'astro';
import {
  listOrdersNormalized,
  listOrders,
  getRevenueStats,
} from '../../../lib/godaddy/orders.js';
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

export const prerender = false;

export const GET: APIRoute = async (context) => {
  // Strict admin-only auth check
  const authResult = await requireAdmin(context.request);
  if (authResult instanceof Response) return authResult;
  const session = authResult;

  const url = new URL(context.request.url);
  const limit = parseInt(url.searchParams.get('limit') ?? '25', 10);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);
  const dateStart = url.searchParams.get('dateStart') ?? undefined;
  const dateEnd = url.searchParams.get('dateEnd') ?? undefined;
  const domain = url.searchParams.get('domain') ?? undefined;
  const normalize = url.searchParams.get('normalize') !== 'false';
  const skipCache = url.searchParams.get('skipCache') === 'true';
  const statsMode = url.searchParams.get('stats') === 'true';

  try {
    // Revenue stats mode — returns aggregated data instead of order list
    if (statsMode) {
      const start = dateStart ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const end = dateEnd ?? new Date().toISOString();
      const stats = await getRevenueStats(start, end);
      return apiOk(stats);
    }

    const options = {
      limit: isNaN(limit) ? 25 : Math.min(limit, 10000),
      offset: isNaN(offset) ? 0 : offset,
      dateStart,
      dateEnd,
      domain,
      skipCache,
    };

    if (normalize) {
      const result = await listOrdersNormalized(options);
      return apiOk(result);
    }

    // Raw mode: return GoDaddy data unmodified (admin debugging only)
    // WARNING: contains microdollar values — use with care
    const raw = await listOrders(options);
    return apiOk(raw);
  } catch (err) {
    return handleGoDaddyError(err);
  }
};
