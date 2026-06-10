/**
 * GET /api/customer/dashboard
 * 
 * Return customer's dashboard data (subscriptions, domains, hosting).
 * Auth required.
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/db/pool.js';
import { requireAuth } from '../../../lib/auth/middleware.js';

interface SubscriptionRow {
  id: number;
  product_id: number;
  status: string;
  current_period_start: Date;
  current_period_end: Date;
}

interface ProductRow {
  id: number;
  name: string;
  category: string;
}

export const GET: APIRoute = async ({ request }) => {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const user = authResult;

  try {
    // Get customer's active subscriptions
    const [subRows] = await query<SubscriptionRow[]>(
      `SELECT s.id, s.product_id, s.status, s.current_period_start, s.current_period_end
       FROM subscriptions s
       WHERE s.user_id = ?
       ORDER BY s.current_period_end DESC`,
      [user.id]
    );

    // Enrich with product names
    const subscriptions = await Promise.all(
      subRows.map(async (sub) => {
        const [prodRows] = await query<ProductRow[]>(
          `SELECT name, category FROM products WHERE id = ?`,
          [sub.product_id]
        );
        const product = prodRows[0] || { name: 'Unknown', category: 'other' };

        return {
          id: sub.id,
          productName: product.name,
          category: product.category,
          status: sub.status,
          currentPeriodStart: sub.current_period_start,
          currentPeriodEnd: sub.current_period_end,
        };
      })
    );

    return new Response(
      JSON.stringify({ success: true, data: { subscriptions } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[dashboard] error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to load dashboard' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
