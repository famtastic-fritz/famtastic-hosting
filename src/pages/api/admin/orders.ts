/**
 * GET /api/admin/orders
 *
 * Order management — proxies GoDaddy /v1/orders with filtering.
 * Supports: status filter (maps to GoDaddy order status), date range, product keyword.
 *
 * Query params:
 *   limit       — max results (default 25, max 200)
 *   offset      — pagination offset
 *   dateStart   — ISO 8601 date (inclusive)
 *   dateEnd     — ISO 8601 date (inclusive)
 *   search      — keyword to filter product labels client-side
 *   status      — 'active' | 'cancelled' | 'expired' | 'all' (default: 'all')
 *
 * NOTE: GoDaddy /v1/orders doesn't support status filtering natively.
 * We fetch orders and filter based on items' period/expiry logic.
 * For MVP we return all orders and let the UI filter.
 *
 * All GoDaddy prices are in MICRODOLLARS — microToUSD() normalizes them.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth/middleware.js';
import { apiOk, handleGoDaddyError } from '../../../lib/api/response.js';
import { listOrdersNormalized } from '../../../lib/godaddy/orders.js';

export const GET: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const limit   = Math.min(parseInt(url.searchParams.get('limit') ?? '25', 10), 200);
  const offset  = parseInt(url.searchParams.get('offset') ?? '0', 10);
  const dateStart = url.searchParams.get('dateStart') ?? undefined;
  const dateEnd   = url.searchParams.get('dateEnd') ?? undefined;
  const search    = url.searchParams.get('search')?.toLowerCase() ?? '';

  try {
    const { orders, total } = await listOrdersNormalized({
      limit,
      offset,
      dateStart,
      dateEnd,
      skipCache: true, // admin dashboard shows real-time data
    });

    // Client-side keyword filter (product label or order ID)
    const filtered = search
      ? orders.filter(o =>
          String(o.orderId).includes(search) ||
          o.items.some(i => i.label.toLowerCase().includes(search))
        )
      : orders;

    return apiOk({
      orders: filtered.map(o => ({
        orderId: o.orderId,
        createdAt: o.createdAt,
        currency: o.currency,
        totalUSD: o.totalUSD,
        subtotalUSD: o.subtotalUSD,
        taxesUSD: o.taxesUSD,
        itemCount: o.items.length,
        items: o.items.map(i => ({
          orderItemId: i.orderItemId,
          label: i.label,
          quantity: i.quantity,
          unitPriceUSD: i.unitPriceUSD,
          period: i.period,
          periodUnit: i.periodUnit,
        })),
      })),
      total: search ? filtered.length : total,
      limit,
      offset,
    });
  } catch (err) {
    return handleGoDaddyError(err);
  }
};
