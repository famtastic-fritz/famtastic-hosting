export const prerender = false;

import type { APIRoute } from 'astro';
import { clearCart } from '../../../lib/cart/index.js';
import { getCartSession } from '../../../lib/cart/cookie.js';
import { capturePayPalOrder, assertValidPayPalOrderId } from '../../../lib/paypal/client.js';
import { query, withTransaction } from '../../../lib/db/pool.js';
import { getSession } from '../../../lib/auth/middleware.js';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

// ─── POST /api/checkout/capture-order ────────────────────────────────────────
// Body: { paypalOrderId: string }
//
// Security design:
//   • Validates paypalOrderId format before any outbound URL use (Fix 3)
//   • Reads cart items from checkout_snapshots (written at create-order time),
//     NOT from live cart_items — prevents TOCTOU / cart-swap attacks (Fix 1)
//   • Verifies PayPal captured amount matches the snapshot subtotal (Fix 1)
//   • Marks snapshot 'captured' in the same transaction as orders INSERT,
//     preventing replay (same paypalOrderId cannot be used twice)
//   • On DB failure after successful PayPal capture, writes to orphan_payments
//     and returns success:false so the client knows to contact support (Fix 2)

interface SnapshotRow extends RowDataPacket {
  paypal_order_id: string;
  session_id: string;
  subtotal_cents: number;
  items_json: string;
  status: string;
}

interface SnapshotItem {
  id: number;
  product_id: number | null;
  name: string;
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

  const rawId = String(body.paypalOrderId ?? '').trim();

  // Fix 3: validate format at the route boundary before any further use
  try {
    assertValidPayPalOrderId(rawId);
  } catch {
    return json({ error: 'Invalid paypalOrderId format' }, 400);
  }

  const paypalOrderId = rawId;
  const sessionId = getCartSession(request);

  // Fix 1: load from snapshot, not live cart
  const [snapRows] = await query<SnapshotRow[]>(
    `SELECT * FROM checkout_snapshots WHERE paypal_order_id = ? AND status = 'pending'`,
    [paypalOrderId],
  );

  if (!snapRows.length) {
    // Snapshot missing or already consumed — could be replay or expired session
    return json({ error: 'Checkout session not found or already used' }, 409);
  }

  const snap = snapRows[0];

  // Session guard: ensure the capture request comes from the same cart session
  // that initiated the order. Prevents a session-swap attack where attacker
  // borrows another user's paypalOrderId.
  if (sessionId && snap.session_id !== sessionId) {
    return json({ error: 'Cart session mismatch' }, 403);
  }

  let items: SnapshotItem[];
  try {
    items = JSON.parse(snap.items_json) as SnapshotItem[];
  } catch {
    return json({ error: 'Invalid checkout session data' }, 500);
  }

  if (!items.length) {
    return json({ error: 'Checkout session has no items' }, 400);
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

  // Fix 1: verify captured amount matches snapshot — rejects TOCTOU manipulation
  const capturedCents = Math.round(parseFloat(capture.amountCaptured) * 100);
  if (Math.abs(capturedCents - snap.subtotal_cents) > 1) {
    // Amount mismatch: PayPal charged a different amount than we expect.
    // Log for reconciliation; do not write the order.
    console.error(
      `[checkout/capture-order] Amount mismatch: captured=${capturedCents} expected=${snap.subtotal_cents} paypalId=${paypalOrderId}`,
    );
    return json({ error: 'Payment amount mismatch — contact support' }, 409);
  }

  // Resolve optional authenticated user — NULL means guest checkout
  let userId: number | null = null;
  try {
    const authUser = await getSession(request);
    if (authUser) userId = Number(authUser.id);
  } catch { /* auth is optional */ }

  const godaddyBase = `PAYPAL-${paypalOrderId}`;
  let firstInsertId: string | null = null;
  let dbError: Error | null = null;

  // Write orders + mark snapshot captured in one transaction (prevents replay)
  try {
    await withTransaction(async (conn: PoolConnection) => {
      // Mark snapshot consumed atomically (fails if already captured → replay rejected)
      const [upd] = await conn.execute(
        `UPDATE checkout_snapshots SET status = 'captured'
         WHERE paypal_order_id = ? AND status = 'pending'`,
        [paypalOrderId],
      ) as [{ affectedRows: number }, unknown];

      if (upd.affectedRows === 0) {
        throw new Error('Snapshot already consumed — duplicate capture rejected');
      }

      // Insert one order row per snapshot item.
      // Disambiguate godaddy_order_id per row to avoid UNIQUE constraint violation.
      for (let i = 0; i < items.length; i++) {
        const item      = items[i];
        const amountCents = item.retail_price_cents * item.quantity;
        const rowRef    = items.length === 1 ? godaddyBase : `${godaddyBase}-${i}`;

        const productId = item.product_id ?? null;
        const [result] = await conn.execute(
          `INSERT INTO orders (user_id, product_id, amount_cents, status, godaddy_order_id)
           VALUES (?, ?, ?, 'processing', ?)`,
          [userId, productId, amountCents, rowRef],
        );
        const res = result as { insertId: number };
        if (!firstInsertId) firstInsertId = String(res.insertId);
      }
    });
  } catch (err) {
    dbError = err instanceof Error ? err : new Error(String(err));
    console.error('[checkout/capture-order] DB write failed (payment captured):', dbError.message);
  }

  // Fix 2: if DB write failed after capture, persist an orphan record
  // so no payment is silently lost. The admin orphan_payments table is the
  // reconciliation source for support.
  if (dbError) {
    try {
      await query(
        `INSERT INTO orphan_payments
           (paypal_order_id, session_id, amount_captured, payer_email, items_json, error_msg)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           error_msg  = VALUES(error_msg),
           resolved   = 0`,
        [
          paypalOrderId,
          snap.session_id,
          parseFloat(capture.amountCaptured),
          capture.payerEmail,
          snap.items_json,
          dbError.message.slice(0, 500),
        ],
      );
    } catch (orphanErr) {
      // Last-resort: at least the server log has the PayPal ID and amount
      console.error(
        '[checkout/capture-order] CRITICAL — orphan record write also failed.',
        'PayPal ID:', paypalOrderId,
        'Amount:', capture.amountCaptured,
        'Payer:', capture.payerEmail,
        orphanErr,
      );
    }

    // Fix 2: do NOT return success:true when the order was not recorded
    return json(
      {
        success: false,
        paypalOrderId,
        amountCaptured: capture.amountCaptured,
        message: 'Payment received but order could not be confirmed. Contact support with your PayPal reference.',
        support: 'hello@famtastichosting.com',
      },
      207,
    );
  }

  // Clear cart (best-effort — cart is already superseded by the snapshot)
  try {
    await clearCart(snap.session_id);
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
