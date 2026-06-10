/**
 * GET /api/admin/reports/revenue
 *
 * CSV export of monthly revenue from GoDaddy /v1/orders.
 * Downloads as: famtastic-revenue-YYYY-MM.csv
 *
 * Query params:
 *   months  — number of months to include (default 12, max 24)
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/auth/middleware.js';
import { apiError, handleGoDaddyError } from '../../../../lib/api/response.js';
import { listOrdersNormalized } from '../../../../lib/godaddy/orders.js';

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

  const url = new URL(request.url);
  const months = Math.min(parseInt(url.searchParams.get('months') ?? '12', 10), 24);

  try {
    const now = new Date();
    const dateStart = new Date(
      now.getFullYear(),
      now.getMonth() - (months - 1),
      1
    ).toISOString();
    const dateEnd = now.toISOString();

    const { orders } = await listOrdersNormalized({
      dateStart,
      dateEnd,
      limit: 10000,
      skipCache: true,
    });

    if (orders.length === 0) {
      return apiError('No orders found in the specified date range.', 'NO_DATA', 404);
    }

    // Build CSV
    const headers = [
      'Order ID',
      'Date',
      'Product(s)',
      'Total USD',
      'Subtotal USD',
      'Tax USD',
      'Item Count',
    ];

    const rows = orders.map(o => [
      String(o.orderId),
      o.createdAt.slice(0, 10),
      o.items.map(i => `${i.label}${i.quantity > 1 ? ` x${i.quantity}` : ''}`).join(' | '),
      o.totalUSD.toFixed(2),
      o.subtotalUSD.toFixed(2),
      o.taxesUSD.toFixed(2),
      String(o.items.length),
    ]);

    const csvLines = [
      headers.map(csvSafe).join(','),
      ...rows.map(row => row.map(csvSafe).join(',')),
    ];

    const csvContent = csvLines.join('\r\n');
    const filename = `famtastic-revenue-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return handleGoDaddyError(err);
  }
};
