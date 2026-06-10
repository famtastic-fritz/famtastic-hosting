/**
 * GET /api/admin/customers
 *
 * Customer list with optional search.
 * Data source: Supabase public.users table (synced from GoDaddy postback or
 * manual admin provisioning). GoDaddy /v1/customers requires OAuth and returns
 * 401 with sso-key — we use our own users table as the source of truth.
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
import { supabaseAdmin } from '../../../lib/supabase/client.js';

export const GET: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const search = url.searchParams.get('search')?.trim() ?? '';
  const limit  = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

  try {
    // Build query — fetch customers (non-admin users)
    let query = supabaseAdmin
      .from('users')
      .select('id, email, role, godaddy_shopper_id, created_at', { count: 'exact' })
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('email', `%${search}%`);
    }

    const { data: users, count, error } = await query;

    if (error) {
      console.error('[admin/customers] Supabase error:', error.message);
      return apiError('Failed to fetch customer list.', 'DB_ERROR', 500);
    }

    if (!users) {
      return apiOk({ customers: [], total: 0, limit, offset });
    }

    // For each customer, fetch order count and total spend
    const customerIds = users.map(u => u.id);

    const { data: orderAggs } = await supabaseAdmin
      .from('orders')
      .select('user_id, amount_cents')
      .in('user_id', customerIds);

    const { data: subCounts } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id')
      .in('user_id', customerIds)
      .eq('status', 'active');

    // Build aggregation maps
    const spendMap = new Map<string, number>();
    const orderCountMap = new Map<string, number>();
    if (orderAggs) {
      for (const row of orderAggs) {
        spendMap.set(row.user_id, (spendMap.get(row.user_id) ?? 0) + row.amount_cents);
        orderCountMap.set(row.user_id, (orderCountMap.get(row.user_id) ?? 0) + 1);
      }
    }

    const subCountMap = new Map<string, number>();
    if (subCounts) {
      for (const row of subCounts) {
        subCountMap.set(row.user_id, (subCountMap.get(row.user_id) ?? 0) + 1);
      }
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
