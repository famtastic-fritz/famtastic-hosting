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
      { status: 200, headers: buildCartHeaders() },
    );
  }

  try {
    const { items, count, subtotalCents } = await buildCartSummary(sessionId);
    const subtotalUSD = formatUSD(subtotalCents);

    return new Response(
      JSON.stringify({ items, count, subtotalUSD }),
      { status: 200, headers: buildCartHeaders() },
    );
  } catch (err) {
    console.error('[cart/index GET]', err);
    return new Response(
      JSON.stringify({ error: 'Failed to load cart' }),
      { status: 500, headers: buildCartHeaders() },
    );
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUSD(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function buildCartHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
    Pragma: 'no-cache',
    Vary: 'Cookie',
  };
}
