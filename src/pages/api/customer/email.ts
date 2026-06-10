/**
 * GET /api/customer/email
 *
 * Returns email account information for the authenticated customer.
 *
 * MVP SCOPE: GoDaddy's email management API (/v1/shoppers, Workspace Email API)
 * requires OAuth/shopper-level auth that is not available with sso-key credentials.
 * This endpoint surfaces email-related orders from order history and provides
 * direct links to GoDaddy's email management interface.
 *
 * Post-MVP: Integrate GoDaddy Workspace Email API with per-shopper OAuth tokens
 * to return actual mailbox list, quotas, and management actions.
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth/middleware.js';
import { listOrdersNormalized } from '../../../lib/godaddy/orders.js';
import { apiOk, handleGoDaddyError } from '../../../lib/api/response.js';
import { pool } from '../../../lib/db/pool.js';

export const prerender = false;

const EMAIL_KEYWORDS = ['email', 'webmail', 'microsoft 365', 'office 365', 'workspace'];

function isEmailProduct(label: string): boolean {
  const l = label.toLowerCase();
  return EMAIL_KEYWORDS.some((kw) => l.includes(kw));
}

export const GET: APIRoute = async (context) => {
  const authResult = await requireAuth(context.request);
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  // GoDaddy email management links
  const WEBMAIL_URL = 'https://login.secureserver.net/';
  const EMAIL_MGMT_URL = 'https://account.godaddy.com/products';
  const ADD_EMAIL_URL = 'https://www.secureserver.net/email-hosting/';

  // IDOR gate: only return data for the authenticated user's linked GoDaddy
  // account. If godaddy_shopper_id is null the account is not yet linked.
  const [rows] = await pool.execute<
    Array<{ godaddy_shopper_id: string | null }>
  >(
    'SELECT godaddy_shopper_id FROM users WHERE id = ?',
    [user.id]
  );

  const shopperId = rows[0]?.godaddy_shopper_id ?? null;

  if (!shopperId) {
    return apiOk({
      emailProducts: [],
      total: 0,
      links: {
        webmail: WEBMAIL_URL,
        manage: EMAIL_MGMT_URL,
        addEmail: ADD_EMAIL_URL,
      },
      note: 'Account not yet linked to GoDaddy. Contact support.',
    });
  }

  try {
    const { orders: allOrders } = await listOrdersNormalized({ limit: 500 });

    // TODO: Filter orders by shopper_id when GoDaddy Reseller API access is
    // available. Currently filtered client-side by godaddy_shopper_id match.
    const orders = allOrders.filter(
      (o) => (o as Record<string, unknown>).shopperId === shopperId
    );

    const emailProducts = orders
      .flatMap((order) =>
        order.items
          .filter((item) => isEmailProduct(item.label))
          .map((item) => ({
            label: item.label,
            orderId: order.orderId,
            purchasedAt: order.createdAt,
            quantity: item.quantity,
            period: item.period,
            periodUnit: item.periodUnit,
            unitPriceUSD: item.unitPriceUSD,
          }))
      )
      .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());

    return apiOk({
      emailProducts,
      total: emailProducts.length,
      links: {
        webmail: WEBMAIL_URL,
        manage: EMAIL_MGMT_URL,
        addEmail: ADD_EMAIL_URL,
      },
      _note: 'Individual mailbox details require GoDaddy Workspace Email API with per-shopper auth. Manage email accounts at the links provided.',
    });
  } catch (err) {
    return handleGoDaddyError(err);
  }
};