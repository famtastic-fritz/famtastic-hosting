export const prerender = false;

import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db/pool.js';
import { requireAuth } from '../../../lib/auth/middleware.js';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ request }) => {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  let body: { productId?: number; quantity?: number };
  try {
    body = await request.json() as { productId?: number; quantity?: number };
  } catch {
    return json({ ok: false, error: 'Invalid request body' }, 400);
  }

  const productId = body.productId;
  const quantity = Math.max(1, parseInt(String(body.quantity ?? 1), 10));

  if (!productId) {
    return json({ ok: false, error: 'productId is required' }, 400);
  }

  const [products] = await pool.execute<
    Array<{ id: number; name: string; retail_price_cents: number; active: number }>
  >(
    'SELECT id, name, retail_price_cents, active FROM products WHERE id = ?',
    [productId]
  );

  if (products.length === 0 || !products[0].active) {
    return json({ ok: false, error: 'Product not found or unavailable' }, 404);
  }

  const product = products[0];
  const amountCents = product.retail_price_cents * quantity;
  const placeholderOrderId = `FAM-${crypto.randomUUID()}`;

  const [result] = await pool.execute<{ insertId: number } & object>(
    `INSERT INTO orders (user_id, product_id, godaddy_order_id, amount_cents, description, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
    [user.id, productId, placeholderOrderId, amountCents, `${product.name} x${quantity}`]
  );

  return new Response(
    JSON.stringify({
      ok: true,
      order: {
        id: (result as any).insertId,
        productName: product.name,
        quantity,
        totalUSD: (amountCents / 100).toFixed(2),
        status: 'pending',
      },
    }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  );
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
