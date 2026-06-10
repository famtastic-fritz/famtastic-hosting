/**
 * GET /api/admin/provisioning
 *
 * Provisioning status view — shows recent GoDaddy orders with status
 * context for the admin to identify stuck/pending activations.
 *
 * GoDaddy doesn't have a dedicated provisioning-status endpoint with sso-key.
 * We use /v1/orders to get recent orders and flag orders older than
 * PROVISIONING_STALE_HOURS as "potentially stuck" for admin review.
 *
 * Query params:
 *   limit     — max orders to show (default 50)
 *   skipCache — '1' to bypass cache (default: cached 2 min)
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth/middleware.js';
import { apiOk, handleGoDaddyError } from '../../../lib/api/response.js';
import { listOrdersNormalized } from '../../../lib/godaddy/orders.js';

/** Orders older than this many hours without resolution are flagged */
const PROVISIONING_STALE_HOURS = 24;

function ageHours(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60);
}

export const GET: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
  const skipCache = url.searchParams.get('skipCache') === '1';

  try {
    const { orders, total } = await listOrdersNormalized({ limit, skipCache });

    const provisioned = orders.map(o => {
      const age = ageHours(o.createdAt);
      const isStale = age > PROVISIONING_STALE_HOURS;

      return {
        orderId: o.orderId,
        createdAt: o.createdAt,
        totalUSD: o.totalUSD,
        ageHours: Math.round(age * 10) / 10,
        isStale,
        status: isStale ? 'review' : 'ok',
        items: o.items.map(i => ({
          label: i.label,
          quantity: i.quantity,
          unitPriceUSD: i.unitPriceUSD,
          period: i.period,
          periodUnit: i.periodUnit,
        })),
      };
    });

    const staleCount = provisioned.filter(o => o.isStale).length;

    return apiOk({
      orders: provisioned,
      total,
      staleCount,
      staleThresholdHours: PROVISIONING_STALE_HOURS,
    });
  } catch (err) {
    return handleGoDaddyError(err);
  }
};
