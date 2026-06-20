export const prerender = false;

/**
 * POST /api/admin/test-purchase
 *
 * Admin-only QA endpoint. Creates a simulated paid order without touching PayPal,
 * so the full order → notification → fulfillment flow can be tested even when no
 * buyer PayPal account is available.
 *
 * Body (optional):
 *   { productId?: number, quantity?: number }
 *
 * Returns:
 *   { success: true, orderIds: string[], paypalOrderId: string }
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/db/pool.js';
import { requireAdmin } from '../../../lib/auth/middleware.js';
import { randomBytes } from 'node:crypto';
import {
  sendAdminOrderNotification,
  sendCustomerReceipt,
} from '../../../lib/email/resend.js';
import type { RowDataPacket } from 'mysql2';

interface ProductRow extends RowDataPacket {
  id: number;
  name: string;
  retail_price_cents: number;
}

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const productId = Number(body.productId ?? 3);
  const quantity  = Math.max(1, Math.min(10, Number(body.quantity ?? 1)));

  const [productRows] = await query<ProductRow[]>(
    'SELECT id, name, retail_price_cents FROM products WHERE id = ? AND active = 1',
    [productId],
  );

  if (!productRows.length) {
    return json({ success: false, error: 'Product not found or inactive' }, 404);
  }

  const product = productRows[0];
  const amountCents = product.retail_price_cents * quantity;
  const amountUSD = (amountCents / 100).toFixed(2);
  const paypalOrderId = `TEST-${randomBytes(8).toString('hex').toUpperCase()}`;

  // Create the same order rows a real capture would create.
  const orderIds: string[] = [];
  await query(
    `INSERT INTO orders (user_id, payer_email, product_id, amount_cents, status, godaddy_order_id)
     VALUES (?, ?, ?, ?, 'processing', ?)`,
    [auth.id, auth.email, product.id, amountCents, paypalOrderId],
  ).then(([result]) => {
    orderIds.push(String((result as { insertId: number }).insertId));
  });

  // Send the same notifications a real payment would trigger.
  const emailItems = [{
    name: product.name,
    quantity,
    priceUSD: product.retail_price_cents / 100,
  }];

  try {
    await sendAdminOrderNotification({
      orderIds,
      paypalOrderId,
      payerEmail: auth.email,
      amountUSD,
      items: emailItems,
    });
  } catch (err) {
    console.error('[test-purchase] admin notification failed:', err);
  }

  try {
    await sendCustomerReceipt({
      to: auth.email,
      orderIds,
      paypalOrderId,
      amountUSD,
      items: emailItems,
    });
  } catch (err) {
    console.error('[test-purchase] customer receipt failed:', err);
  }

  return json({
    success: true,
    orderIds,
    paypalOrderId,
    message: 'Test order created. Check admin/orders to mark fulfilled and verify the active email.',
  }, 200);
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
