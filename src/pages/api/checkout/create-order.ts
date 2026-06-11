export const prerender = false;

import type { APIRoute } from 'astro';
import { buildCartSummary } from '../../../lib/cart/index.js';
import { getCartSession } from '../../../lib/cart/cookie.js';
import { createPayPalOrder } from '../../../lib/paypal/client.js';
import { query } from '../../../lib/db/pool.js';

// ─── POST /api/checkout/create-order ─────────────────────────────────────────
// Creates a PayPal order for the current cart total.
// Snapshots the cart into checkout_snapshots keyed by paypalOrderId so that
// capture-order uses the locked snapshot rather than the live cart (prevents
// TOCTOU / cart-swap attacks).
// Returns: { paypalOrderId }

export const POST: APIRoute = async ({ request }) => {
  const sessionId = getCartSession(request);

  if (!sessionId) {
    return json({ error: 'No cart session found' }, 400);
  }

  const { items, subtotalCents } = await buildCartSummary(sessionId);

  if (!items.length) {
    return json({ error: 'Cart is empty' }, 400);
  }

  if (subtotalCents <= 0) {
    return json({ error: 'Invalid cart total' }, 400);
  }

  let paypalOrderId: string;
  try {
    paypalOrderId = await createPayPalOrder(subtotalCents);
  } catch (err) {
    console.error('[checkout/create-order]', err);
    return json({ error: 'Failed to create PayPal order' }, 500);
  }

  // Snapshot the cart atomically so capture-order reads this, not live cart_items
  try {
    await query(
      `INSERT INTO checkout_snapshots
         (paypal_order_id, session_id, subtotal_cents, items_json, status)
       VALUES (?, ?, ?, ?, 'pending')
       ON DUPLICATE KEY UPDATE
         session_id    = VALUES(session_id),
         subtotal_cents = VALUES(subtotal_cents),
         items_json    = VALUES(items_json),
         status        = 'pending'`,
      [paypalOrderId, sessionId, subtotalCents, JSON.stringify(items)],
    );
  } catch (err) {
    // Snapshot write failed — the PayPal order is created but we can't safely
    // proceed without the snapshot. Return an error so the customer retries.
    console.error('[checkout/create-order] snapshot write failed:', err);
    return json({ error: 'Checkout session could not be initialized. Please try again.' }, 500);
  }

  return json({ paypalOrderId }, 200);
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
