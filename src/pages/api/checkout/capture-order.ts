export const prerender = false;

import type { APIRoute } from 'astro';
import { clearCart } from '../../../lib/cart/index.js';
import { getCartSession } from '../../../lib/cart/cookie.js';
import { capturePayPalOrder } from '../../../lib/paypal/client.js';
import { query, withTransaction } from '../../../lib/db/pool.js';
import { getSession } from '../../../lib/auth/middleware.js';
import type { RowDataPacket } from 'mysql2/promise';
import type { PoolConnection } from 'mysql2/promise';

// ─── POST /api/checkout/capture-order ────────────────────────────────────────
// Body: { paypalOrderId: string }
//
// Flow:
//   1. Capture the PayPal order (charges the customer)
//   2. Write one orders row per cart item (status='paid', godaddy_order_id=PAYPAL-xxx)
//   3. Clear the cart
//   4. Return { orderId, paypalOrderId }

interface CartItemRow extends RowDataPacket {
  product_id: number;
  retail_price_cents: number;
  quantity: number;
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const paypalOrderId = String(body.paypalOrderId ?? '').trim();
  if (!paypalOrderId) {
    return json({ error: 'paypalOrderId is required' }, 400);
  }

  const sessionId = getCartSession(request);
  if (!sessionId) {
    return json({ error: 'No cart session' }, 400);
  }

  // Load cart items with actual product_ids
  const [rows] = await query<CartItemRow[]>(
    `SELECT ci.product_id, p.retail_price_cents, ci.quantity
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.session_id = ?`,
    [sessionId],
  );

  if (!rows.length) {
    return json({ error: 'Cart is empty' }, 400);
  }

  // Capture payment — money moves here
  let capture;
  try {
    capture = await capturePayPalOrder(paypalOrderId);
  } catch (err) {
    console.error('[checkout/capture-order] PayPal capture failed:', err);
    return json({ error: 'Payment capture failed' }, 502);
  }

  if (capture.status !== 'COMPLETED') {
    console.error('[checkout/capture-order] Unexpected PayPal status:', capture.status);
    return json({ error: `Payment not completed: ${capture.status}` }, 502);
  }

  // Resolve optional authenticated user
  let userId: string | null = null;
  try {
    const authUser = await getSession(request);
    if (authUser) userId = authUser.id;
  } catch { /* auth is optional */ }

  const godaddyRef = `PAYPAL-${paypalOrderId}`;
  let firstInsertId: string | null = null;

  // Write one order row per product in a transaction
  try {
    await withTransaction(async (conn: PoolConnection) => {
      for (const item of rows) {
        const amountCents = item.retail_price_cents * item.quantity;
        const [result] = await conn.execute(
          `INSERT INTO orders (user_id, product_id, amount_cents, status, godaddy_order_id)
           VALUES (?, ?, ?, 'paid', ?)`,
          [userId, item.product_id, amountCents, godaddyRef],
        );
        const res = result as { insertId: number };
        if (!firstInsertId) firstInsertId = String(res.insertId);
      }
    });
  } catch (err) {
    // Payment already captured — log so admin can reconcile manually
    console.error('[checkout/capture-order] DB write failed (payment captured):', err);
  }

  // Clear cart (best-effort)
  try {
    await clearCart(sessionId);
  } catch (err) {
    console.error('[checkout/capture-order] clearCart failed:', err);
  }

  return json(
    {
      success: true,
      orderId: firstInsertId,
      paypalOrderId,
      amountCaptured: capture.amountCaptured,
    },
    200,
  );
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
