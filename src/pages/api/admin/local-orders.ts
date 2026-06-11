export const prerender = false;

import type { APIRoute } from 'astro';
import { query } from '../../../lib/db/pool.js';
import { requireAdmin } from '../../../lib/auth/middleware.js';
import type { RowDataPacket } from 'mysql2';

// ─── GET /api/admin/local-orders ─────────────────────────────────────────────
// Returns orders from local DB (PayPal-backed, not GoDaddy).
// Supports ?status= filter (default: 'processing').

interface OrderRow extends RowDataPacket {
  id: number;
  user_id: string | null;
  user_email: string | null;
  product_id: number;
  product_name: string;
  amount_cents: number;
  status: string;
  godaddy_order_id: string;
  created_at: Date;
}

export const GET: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const url    = new URL(request.url);
  const status = url.searchParams.get('status') ?? 'processing';

  const [rows] = await query<OrderRow[]>(
    `SELECT
       o.id, o.user_id, u.email AS user_email,
       o.product_id, p.name AS product_name,
       o.amount_cents, o.status, o.godaddy_order_id, o.created_at
     FROM orders o
     LEFT JOIN users u  ON u.id  = o.user_id
     LEFT JOIN products p ON p.id = o.product_id
     WHERE o.status = ?
     ORDER BY o.created_at DESC
     LIMIT 100`,
    [status],
  );

  const orders = rows.map(r => ({
    id:            r.id,
    userId:        r.user_id,
    userEmail:     r.user_email,
    productId:     r.product_id,
    productName:   r.product_name,
    amountUSD:     (r.amount_cents / 100).toFixed(2),
    status:        r.status,
    paypalRef:     r.godaddy_order_id,
    createdAt:     r.created_at,
  }));

  return json({ data: { orders, count: orders.length } }, 200);
};

// ─── PUT /api/admin/local-orders ─────────────────────────────────────────────
// Body: { orderId: number, status: 'active' | 'cancelled' }

export const PUT: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const orderId = Number(body.orderId);
  const status  = String(body.status ?? '').trim();

  if (!orderId || !['active', 'cancelled'].includes(status)) {
    return json({ error: 'orderId and valid status required' }, 400);
  }

  await query(
    `UPDATE orders SET status = ? WHERE id = ?`,
    [status, orderId],
  );

  return json({ success: true, orderId, status }, 200);
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
