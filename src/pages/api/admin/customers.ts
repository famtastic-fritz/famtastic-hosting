/**
 * GET /api/admin/customers
 *
 * Customer list with optional search.
 * Data source: MySQL users table.
 *
 * Query params:
 *   search  — filter by email (partial match)
 *   limit   — max results (default 50)
 *   offset  — pagination offset
 *
 * For each customer we also pull their subscription count and total spend
 * from the orders table.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth/middleware.js';
import { apiOk, apiError } from '../../../lib/api/response.js';
import { pool } from '../../../lib/db/pool.js';

export const GET: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const search = url.searchParams.get('search')?.trim() ?? '';
  const limit  = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

  try {
    // Fetch customers (non-admin)
    let customerQuery: string;
    let params: unknown[];

    if (search) {
      customerQuery = 'SELECT id, email, role, godaddy_shopper_id, created_at FROM users WHERE role = ? AND email LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params = ['customer', `%${search}%`, limit, offset];
    } else {
      customerQuery = 'SELECT id, email, role, godaddy_shopper_id, created_at FROM users WHERE role = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params = ['customer', limit, offset];
    }

    const [users] = await pool.execute<
      Array<{ id: string; email: string; role: string; godaddy_shopper_id: string | null; created_at: string }>
    >(customerQuery, params);

    // Get total count
    const [countResult] = await pool.execute<Array<{ cnt: number }>>(
      'SELECT COUNT(*) as cnt FROM users WHERE role = ?',
      ['customer']
    );
    const count = countResult[0]?.cnt ?? users.length;

    if (!users || users.length === 0) {
      return apiOk({ customers: [], total: 0, limit, offset });
    }

    // For each customer, fetch order count and total spend
    const customerIds = users.map(u => u.id);
    const placeholders = customerIds.map(() => '?').join(',');

    const [orderAggs] = await pool.execute<
      Array<{ user_id: string; total_cents: number; order_count: number }>
    >(
      `SELECT user_id, SUM(amount_cents) as total_cents, COUNT(*) as order_count FROM orders WHERE user_id IN (${placeholders}) GROUP BY user_id`,
      customerIds
    );

    const [subCounts] = await pool.execute<
      Array<{ user_id: string; sub_count: number }>
    >(
      `SELECT user_id, COUNT(*) as sub_count FROM subscriptions WHERE user_id IN (${placeholders}) AND status = 'active' GROUP BY user_id`,
      customerIds
    );

    // Build aggregation maps
    const spendMap = new Map<string, number>();
    const orderCountMap = new Map<string, number>();
    for (const row of orderAggs) {
      spendMap.set(row.user_id, row.total_cents);
      orderCountMap.set(row.user_id, row.order_count);
    }

    const subCountMap = new Map<string, number>();
    for (const row of subCounts) {
      subCountMap.set(row.user_id, row.sub_count);
    }

    const customers = users.map(u => ({
      id: u.id,
      email: u.email,
      godaddy_shopper_id: u.godaddy_shopper_id,
      created_at: u.created_at,
      activeSubscriptions: subCountMap.get(u.id) ?? 0,
      orderCount: orderCountMap.get(u.id) ?? 0,
      totalSpendUSD: ((spendMap.get(u.id) ?? 0) / 100).toFixed(2),
    }));

    return apiOk({
      customers,
      total: count ?? customers.length,
      limit,
      offset,
    });
  } catch (err) {
    console.error('[admin/customers] Unexpected error:', err);
    return apiError('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
  }
};