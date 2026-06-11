/**
 * PATCH /api/admin/products/:id
 *
 * Update a product's retail price and/or active status.
 * Recalculates markup_pct automatically when retail_price changes.
 *
 * PUT /api/admin/products/:id
 *
 * Full update of editable product fields:
 *   name, retail_price_cents, active, billing_period
 * Recalculates markup_pct from wholesale_price when retail_price_cents changes.
 *
 * DELETE /api/admin/products/:id
 *
 * Soft-delete: sets active = 0. Product remains in the catalog but is hidden.
 *
 * Auth: requireAdmin()
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/auth/middleware.js';
import { apiOk, apiError } from '../../../../lib/api/response.js';
import { pool } from '../../../../lib/db/pool.js';

// ─── Shared: fetch the updated row and return it ─────────────────────────────

async function fetchProduct(id: string) {
  const [rows] = await pool.execute<
    Array<{
      id: string;
      name: string;
      category: string;
      wholesale_price_cents: number;
      retail_price_cents: number;
      markup_pct: number;
      active: number;
      billing_period: string | null;
      updated_at: string;
    }>
  >(
    'SELECT id, name, category, wholesale_price_cents, retail_price_cents, markup_pct, active, billing_period, updated_at FROM products WHERE id = ?',
    [id]
  );
  if (rows.length === 0) return null;
  const p = rows[0];
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    wholesalePriceUSD: (p.wholesale_price_cents / 100).toFixed(2),
    retailPriceUSD: (p.retail_price_cents / 100).toFixed(2),
    markupPct: p.markup_pct,
    active: !!p.active,
    billing_period: p.billing_period,
    updated_at: p.updated_at,
  };
}

// ─── PATCH: targeted partial update (retail price + active) ──────────────────

export const PATCH: APIRoute = async ({ request, params }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const { id } = params;
  if (!id) return apiError('Product ID is required.', 'MISSING_ID', 400);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError('Invalid JSON body.', 'INVALID_JSON', 400);
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  };

  if ('active' in body) {
    if (typeof body.active !== 'boolean') {
      return apiError('active must be a boolean.', 'INVALID_FIELD', 400);
    }
    updates.active = body.active;
  }

  if ('retail_price_cents' in body) {
    const rp = Number(body.retail_price_cents);
    if (!Number.isInteger(rp) || rp < 0) {
      return apiError('retail_price_cents must be a non-negative integer.', 'INVALID_FIELD', 400);
    }
    updates.retail_price_cents = rp;

    const [currentRows] = await pool.execute<Array<{ wholesale_price_cents: number }>>(
      'SELECT wholesale_price_cents FROM products WHERE id = ?',
      [id]
    );
    if (currentRows.length === 0) {
      return apiError('Product not found.', 'NOT_FOUND', 404);
    }
    const wholesale = currentRows[0].wholesale_price_cents;
    updates.markup_pct = wholesale > 0 ? Math.round((rp / wholesale) * 100) : 0;
  }

  if (Object.keys(updates).length === 1) {
    return apiError('No valid fields to update.', 'NO_UPDATES', 400);
  }

  try {
    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    const [result] = await pool.execute(`UPDATE products SET ${setClauses} WHERE id = ?`, values);
    const updateResult = result as { affectedRows: number };
    if (updateResult.affectedRows === 0) {
      return apiError('Product not found.', 'NOT_FOUND', 404);
    }

    const product = await fetchProduct(id);
    if (!product) return apiError('Product not found after update.', 'NOT_FOUND', 404);
    return apiOk({ product });
  } catch (err) {
    console.error('[admin/products/:id PATCH] Unexpected error:', err);
    return apiError('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
  }
};

// ─── PUT: full editable-field update ─────────────────────────────────────────

export const PUT: APIRoute = async ({ request, params }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const { id } = params;
  if (!id) return apiError('Product ID is required.', 'MISSING_ID', 400);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError('Invalid JSON body.', 'INVALID_JSON', 400);
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  };

  if ('name' in body) {
    const name = String(body.name ?? '').trim();
    if (!name) return apiError('name cannot be empty.', 'INVALID_FIELD', 400);
    updates.name = name;
  }

  if ('retail_price_cents' in body) {
    const rp = Number(body.retail_price_cents);
    if (!Number.isInteger(rp) || rp < 0) {
      return apiError('retail_price_cents must be a non-negative integer.', 'INVALID_FIELD', 400);
    }
    updates.retail_price_cents = rp;

    const [currentRows] = await pool.execute<Array<{ wholesale_price_cents: number }>>(
      'SELECT wholesale_price_cents FROM products WHERE id = ?',
      [id]
    );
    if (currentRows.length === 0) {
      return apiError('Product not found.', 'NOT_FOUND', 404);
    }
    const wholesale = currentRows[0].wholesale_price_cents;
    updates.markup_pct = wholesale > 0 ? Math.round((rp / wholesale) * 100) : 0;
  }

  if ('active' in body) {
    updates.active = body.active ? 1 : 0;
  }

  if ('billing_period' in body) {
    const bp = body.billing_period;
    if (bp !== null && !['monthly', 'annual', 'biennial', 'one-time'].includes(String(bp))) {
      return apiError('Invalid billing_period value.', 'INVALID_FIELD', 400);
    }
    updates.billing_period = bp;
  }

  if (Object.keys(updates).length === 1) {
    return apiError('No valid fields to update.', 'NO_UPDATES', 400);
  }

  try {
    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    const [result] = await pool.execute(`UPDATE products SET ${setClauses} WHERE id = ?`, values);
    const updateResult = result as { affectedRows: number };
    if (updateResult.affectedRows === 0) {
      return apiError('Product not found.', 'NOT_FOUND', 404);
    }

    const product = await fetchProduct(id);
    if (!product) return apiError('Product not found after update.', 'NOT_FOUND', 404);
    return apiOk({ product });
  } catch (err) {
    console.error('[admin/products/:id PUT] Unexpected error:', err);
    return apiError('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
  }
};

// ─── DELETE: soft-delete (set active = 0) ────────────────────────────────────

export const DELETE: APIRoute = async ({ request, params }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const { id } = params;
  if (!id) return apiError('Product ID is required.', 'MISSING_ID', 400);

  try {
    const [result] = await pool.execute(
      'UPDATE products SET active = 0, updated_at = NOW() WHERE id = ?',
      [id]
    );
    const updateResult = result as { affectedRows: number };
    if (updateResult.affectedRows === 0) {
      return apiError('Product not found.', 'NOT_FOUND', 404);
    }

    return apiOk({ id, deactivated: true });
  } catch (err) {
    console.error('[admin/products/:id DELETE] Unexpected error:', err);
    return apiError('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
  }
};
