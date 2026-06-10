/**
 * GET /api/customer/hosting
 *
 * Returns hosting plan summary for the authenticated customer.
 *
 * MVP SCOPE: GoDaddy's API does not expose per-shopper hosting plan details
 * at the sso-key tier. This endpoint returns plan data derived from order
 * history — specifically orders that contain hosting product labels.
 *
 * Full cPanel resource usage (bandwidth, storage) requires the GoDaddy WHM
 * API or cPanel XML-API, which is outside the current scope.
 * For now, we surface plan identity and link to GoDaddy's cPanel login.
 *
 * Response shape:
 *   plans: Array<{
 *     label: string          Product label from order
 *     orderId: number
 *     purchasedAt: string    ISO 8601
 *     period: number
 *     periodUnit: string
 *     status: "active" | "unknown"
 *     cPanelUrl: string      Link to GoDaddy cPanel login
 *   }>
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth/middleware.js';
import { listOrdersNormalized } from '../../../lib/godaddy/orders.js';
import { apiOk, handleGoDaddyError } from '../../../lib/api/response.js';

export const prerender = false;

// Hosting-related keyword patterns in GoDaddy product labels
const HOSTING_KEYWORDS = [
  'hosting',
  'cpanel',
  'web hosting',
  'managed wordpress',
  'wordpress',
  'web hosting plus',
  'website builder',
];

function isHostingProduct(label: string): boolean {
  const l = label.toLowerCase();
  return HOSTING_KEYWORDS.some((kw) => l.includes(kw));
}

export const GET: APIRoute = async (context) => {
  const authResult = await requireAuth(context.request);
  if (authResult instanceof Response) return authResult;

  // GoDaddy cPanel login URL (white-labeled through reseller)
  const CPANEL_URL = 'https://sg1plcpnl0082.prod.sin2.secureserver.net:2083';

  try {
    // Pull last 500 orders — more than enough for a customer's history
    const { orders } = await listOrdersNormalized({ limit: 500 });

    const hostingPlans = orders
      .flatMap((order) =>
        order.items
          .filter((item) => isHostingProduct(item.label))
          .map((item) => ({
            label: item.label,
            orderId: order.orderId,
            purchasedAt: order.createdAt,
            period: item.period,
            periodUnit: item.periodUnit,
            totalPaidUSD: item.unitPriceUSD * item.quantity,
            status: 'active' as const,
            cPanelUrl: CPANEL_URL,
          }))
      )
      // Most recent first
      .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());

    return apiOk({
      plans: hostingPlans,
      total: hostingPlans.length,
      cPanelUrl: CPANEL_URL,
      // Note sent to client — no per-customer filtering at sso-key tier
      _note: 'Hosting plans derived from order history. Resource usage metrics require direct cPanel API integration.',
    });
  } catch (err) {
    return handleGoDaddyError(err);
  }
};
