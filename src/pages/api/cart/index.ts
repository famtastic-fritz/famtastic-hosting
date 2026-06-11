export const prerender = false;

import type { APIRoute } from 'astro';
import { buildCartSummary } from '../../../lib/cart/index.js';
import { CART_COOKIE, getCartSession } from '../../../lib/cart/cookie.js';

// ─── GET /api/cart ────────────────────────────────────────────────────────────
// Returns the current cart contents, item count, and subtotal.

export const GET: APIRoute = async ({ request }) => {
  const sessionId = getCartSession(request);

  if (!sessionId) {
    return new Response(
      JSON.stringify({ items: [], count: 0, subtotalUSD: '$0.00' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const { items, count, subtotalCents } = await buildCartSummary(sessionId);
    const subtotalUSD = formatUSD(subtotalCents);

    return new Response(
      JSON.stringify({ items, count, subtotalUSD }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[cart/index GET]', err);
    return new Response(
      JSON.stringify({ error: 'Failed to load cart' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUSD(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
