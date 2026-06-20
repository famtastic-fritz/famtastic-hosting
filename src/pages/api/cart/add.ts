export const prerender = false;

import type { APIRoute } from 'astro';
import { addToCart, buildCartSummary } from '../../../lib/cart/index.js';
import {
  CART_COOKIE,
  getCartSession,
  generateCartSession,
  buildCartCookieHeader,
} from '../../../lib/cart/cookie.js';
import { getSession } from '../../../lib/auth/middleware.js';

// ─── POST /api/cart/add ───────────────────────────────────────────────────────
// Body: { productId: number, quantity?: number }
// Reads or generates a cart session cookie, adds the item, returns updated cart.

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const productId = Number(body.productId);
  const quantity  = Math.max(1, Number(body.quantity) || 1);

  if (!productId || isNaN(productId)) {
    return jsonError('productId is required', 400);
  }

  // Resolve (or create) the cart session
  let sessionId    = getCartSession(request);
  let isNewSession = false;

  if (!sessionId) {
    sessionId    = generateCartSession();
    isNewSession = true;
  }

  // Optional: link to authenticated user
  let userId: number | null = null;
  try {
    const authUser = await getSession(request);
    if (authUser) userId = Number(authUser.id) || null;
  } catch {
    // authentication is optional — ignore errors
  }

  try {
    await addToCart(sessionId, productId, quantity, userId);
    const { items, count, subtotalCents } = await buildCartSummary(sessionId);
    const subtotalUSD = formatUSD(subtotalCents);

    const headers = buildCartHeaders();

    if (isNewSession) {
      headers['Set-Cookie'] = buildCartCookieHeader(sessionId);
    }

    return new Response(
      JSON.stringify({ items, count, subtotalUSD }),
      { status: 200, headers },
    );
  } catch (err) {
    console.error('[cart/add POST]', err);
    return jsonError('Failed to add item to cart', 500);
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
