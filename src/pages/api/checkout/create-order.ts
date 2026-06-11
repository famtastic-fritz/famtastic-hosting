export const prerender = false;

import type { APIRoute } from 'astro';
import { buildCartSummary } from '../../../lib/cart/index.js';
import { getCartSession } from '../../../lib/cart/cookie.js';
import { createPayPalOrder } from '../../../lib/paypal/client.js';

// ─── POST /api/checkout/create-order ─────────────────────────────────────────
// Creates a PayPal order for the current cart total.
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

  try {
    const paypalOrderId = await createPayPalOrder(subtotalCents);
    return json({ paypalOrderId }, 200);
  } catch (err) {
    console.error('[checkout/create-order]', err);
    return json({ error: 'Failed to create PayPal order' }, 500);
  }
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
