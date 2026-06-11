export const prerender = false;

import type { APIRoute } from 'astro';
import { clearCart } from '../../../lib/cart/index.js';
import { getCartSession } from '../../../lib/cart/cookie.js';

// ─── POST /api/cart/clear ─────────────────────────────────────────────────────
// Removes all items from the current session's cart.

export const POST: APIRoute = async ({ request }) => {
  const sessionId = getCartSession(request);

  if (!sessionId) {
    return new Response(
      JSON.stringify({ ok: true, items: [], count: 0, subtotalUSD: '$0.00' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    await clearCart(sessionId);
    return new Response(
      JSON.stringify({ ok: true, items: [], count: 0, subtotalUSD: '$0.00' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[cart/clear POST]', err);
    return new Response(
      JSON.stringify({ error: 'Failed to clear cart' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
