/**
 * GET /api/customer/billing
 *
 * Returns order/invoice history for the authenticated customer.
 *
 * Data source: GoDaddy /v1/orders — all prices in microdollars, normalized to
 * USD by listOrdersNormalized() before sending to the client.
 *
 * Query parameters:
 *   limit     - max orders (default 25, max 100)
 *   offset    - pagination offset
 *   dateStart - ISO 8601 start date filter
 *   dateEnd   - ISO 8601 end date filter
 *
 * CRITICAL: GoDaddy pricing is in MICRODOLLARS — always use listOrdersNormalized()
 * which divides by 1,000,000. Never return raw GoDaddy pricing to the client.
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth/middleware.js';
import { listOrdersNormalized } from '../../../lib/godaddy/orders.js';
import { apiOk, handleGoDaddyError } from '../../../lib/api/response.js';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const authResult = await requireAuth(context.request);
  if (authResult instanceof Response) return authResult;

  const url = new URL(context.request.url);
  const limit = Math.min(
    parseInt(url.searchParams.get('limit') ?? '25', 10) || 25,
    100
  );
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0;
  const dateStart = url.searchParams.get('dateStart') ?? undefined;
  const dateEnd = url.searchParams.get('dateEnd') ?? undefined;

  try {
    const { orders, total } = await listOrdersNormalized({
      limit,
      offset,
      dateStart,
      dateEnd,
    });

    // Compute upcoming renewals (orders with period info, created within last 2 years)
    const now = Date.now();
    const upcomingRenewals = orders
      .flatMap((order) =>
        order.items
          .filter((item) => item.period && item.periodUnit)
          .map((item) => {
            const createdMs = new Date(order.createdAt).getTime();
            const periodMs =
              item.periodUnit === 'YEAR'
                ? (item.period ?? 1) * 365 * 24 * 60 * 60 * 1000
                : (item.period ?? 1) * 30 * 24 * 60 * 60 * 1000;
            const renewalDate = new Date(createdMs + periodMs);
            const daysUntil = Math.ceil((renewalDate.getTime() - now) / (1000 * 60 * 60 * 24));

            return {
              orderId: order.orderId,
              label: item.label,
              renewalDate: renewalDate.toISOString(),
              daysUntil,
              amountUSD: item.unitPriceUSD,
            };
          })
          .filter((r) => r.daysUntil > 0 && r.daysUntil <= 90)
      )
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 10);

    return apiOk({
      orders: orders.map((order) => ({
        orderId: order.orderId,
        createdAt: order.createdAt,
        totalUSD: order.totalUSD,
        subtotalUSD: order.subtotalUSD,
        taxesUSD: order.taxesUSD,
        currency: order.currency,
        items: order.items.map((item) => ({
          label: item.label,
          quantity: item.quantity,
          unitPriceUSD: item.unitPriceUSD,
          period: item.period,
          periodUnit: item.periodUnit,
        })),
      })),
      total,
      upcomingRenewals,
      pagination: { limit, offset },
    });
  } catch (err) {
    return handleGoDaddyError(err);
  }
};
