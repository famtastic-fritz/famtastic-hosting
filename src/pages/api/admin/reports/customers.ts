/**
 * GET /api/admin/reports/customers
 *
 * CSV export of all customers from the Supabase users table.
 * Downloads as: famtastic-customers-YYYY-MM-DD.csv
 *
 * Includes: email, created date, active subscriptions, order count, total spend.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/auth/middleware.js';
import { apiError } from '../../../../lib/api/response.js';
import { supabaseAdmin } from '../../../../lib/supabase/client.js';

/**
 * Escapes a value for safe inclusion in a CSV cell.
 *
 * Prefixes cells starting with =, +, -, @, tab, or carriage return with a
 * single quote so spreadsheet applications (Excel, Google Sheets) do not
 * interpret them as formula or DDE injection.
 */
function csvSafe(v: unknown): string {
  const s = String(v ?? '');
  const escaped = (/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replace(/"/g, '""');
  return `"${escaped}"`;
}

export const GET: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    // Fetch all customers
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, created_at')
      .eq('role', 'customer')
      .order('created_at', { ascending: false });

    if (error) {
      return apiError('Failed to fetch customer data.', 'DB_ERROR', 500);
    }

    if (!users || users.length === 0) {
      return apiError('No customers found.', 'NO_DATA', 404);
    }

    // Fetch aggregated order data
    const userIds = users.map(u => u.id);

    const [{ data: orders }, { data: subs }] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('user_id, amount_cents')
        .in('user_id', userIds),
      supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .in('user_id', userIds)
        .eq('status', 'active'),
    ]);

    const spendMap = new Map<string, number>();
    const orderCountMap = new Map<string, number>();
    if (orders) {
      for (const o of orders) {
        spendMap.set(o.user_id, (spendMap.get(o.user_id) ?? 0) + o.amount_cents);
        orderCountMap.set(o.user_id, (orderCountMap.get(o.user_id) ?? 0) + 1);
      }
    }

    const subMap = new Map<string, number>();
    if (subs) {
      for (const s of subs) {
        subMap.set(s.user_id, (subMap.get(s.user_id) ?? 0) + 1);
      }
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
