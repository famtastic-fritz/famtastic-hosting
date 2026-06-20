export const prerender = false;

import type { APIRoute } from 'astro';
import { updateCartItem, buildCartSummary } from '../../../lib/cart/index.js';
import { getCartSession } from '../../../lib/cart/cookie.js';

// ─── PUT /api/cart/update ─────────────────────────────────────────────────────
// Body: { itemId: number, quantity: number }
// Session must match the item's session_id (IDOR protection enforced in lib).

export const PUT: APIRoute = async ({ request }) => {
  const sessionId = getCartSession(request);
  if (!sessionId) {
    return jsonError('No cart session', 400);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const itemId   = Number(body.itemId);
  const quantity = Number(body.quantity);

  if (!itemId || isNaN(itemId)) {
    return jsonError('itemId is required', 400);
  }
  if (isNaN(quantity)) {
    return jsonError('quantity is required', 400);
  }

  try {
    await updateCartItem(itemId, quantity, sessionId);
    const { items, count, subtotalCents } = await buildCartSummary(sessionId);
    const subtotalUSD = formatUSD(subtotalCents);

    return new Response(
      JSON.stringify({ items, count, subtotalUSD }),
      { status: 200, headers: buildCartHeaders() },
    );
  } catch (err) {
    console.error('[cart/update PUT]', err);
    return jsonError('Failed to update cart item', 500);
  }
};

function formatUSD(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: buildCartHeaders() },
  );
}

function buildCartHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
    Pragma: 'no-cache',
    Vary: 'Cookie',
  };
}
