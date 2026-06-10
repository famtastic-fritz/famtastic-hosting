/**
 * GET /api/admin/reports/customers
 *
 * CSV export of all customers from MySQL users table.
 * Downloads as: famtastic-customers-YYYY-MM-DD.csv
 *
 * Includes: email, created date, active subscriptions, order count, total spend.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/auth/middleware.js';
import { apiError } from '../../../../lib/api/response.js';
import { pool } from '../../../../lib/db/pool.js';

/**
 * Escapes a value for safe inclusion in a CSV cell.
 * Prefixes cells starting with =, +, -, @, tab, or carriage return with a
 * single quote so spreadsheet applications do not interpret them as formulas.
 */
function csvSafe(v: unknown): string {
  const s = String(v ?? '');
  const escaped = (/^[=+\-\@\t\r]/.test(s) ? "'" + s : s).replace(/"/g, '""');
  return `"${escaped}"`;
}

export const GET: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    // Fetch all customers
    const [users] = await pool.execute<
      Array<{ id: string; email: string; created_at: string }>
    >(
      "SELECT id, email, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC"
    );

    if (!users || users.length === 0) {
      return apiError('No customers found.', 'NO_DATA', 404);
    }

    // Fetch aggregated order data
    const userIds = users.map(u => u.id);
    const placeholders = userIds.map(() => '?').join(',');

    const [orderAggs] = await pool.execute<
      Array<{ user_id: string; total_cents: number; order_count: number }>
    >(
      `SELECT user_id, SUM(amount_cents) as total_cents, COUNT(*) as order_count FROM orders WHERE user_id IN (${placeholders}) GROUP BY user_id`,
      userIds
    );

    const [subAggs] = await pool.execute<
      Array<{ user_id: string; sub_count: number }>
    >(
      `SELECT user_id, COUNT(*) as sub_count FROM subscriptions WHERE user_id IN (${placeholders}) AND status = 'active' GROUP BY user_id`,
      userIds
    );

    const spendMap = new Map<string, number>();
    const orderCountMap = new Map<string, number>();
    for (const row of orderAggs) {
      spendMap.set(row.user_id, row.total_cents);
      orderCountMap.set(row.user_id, row.order_count);
    }

    const subMap = new Map<string, number>();
    for (const row of subAggs) {
      subMap.set(row.user_id, row.sub_count);
    }

    // Build CSV
    const headers = [
      'Email',
      'Joined',
      'Active Subscriptions',
      'Total Orders',
      'Total Spend USD',
    ];

    const rows = users.map(u => [
      u.email,
      u.created_at.slice(0, 10),
      String(subMap.get(u.id) ?? 0),
      String(orderCountMap.get(u.id) ?? 0),
      ((spendMap.get(u.id) ?? 0) / 100).toFixed(2),
    ]);

    const csvLines = [
      headers.map(csvSafe).join(','),
      ...rows.map(row => row.map(csvSafe).join(',')),
    ];

    const csvContent = csvLines.join('\r\n');
    const today = new Date().toISOString().slice(0, 10);
    const filename = `famtastic-customers-${today}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[reports/customers] Unexpected error:', err);
    return apiError('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
  }
};