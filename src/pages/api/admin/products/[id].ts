/**
 * PATCH /api/admin/products/:id
 *
 * Update a product's retail price and/or active status.
 * Recalculates markup_pct automatically when retail_price changes.
 *
 * Body (all fields optional):
 *   retail_price   — new retail price in cents (integer)
 *   active         — boolean to enable/disable the product
 *
 * Returns the updated product row.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/auth/middleware.js';
import { apiOk, apiError } from '../../../../lib/api/response.js';
import { pool } from '../../../../lib/db/pool.js';

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

  // Validate inputs
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  };

  if ('active' in body) {
    if (typeof body.active !== 'boolean') {
      return apiError('active must be a boolean.', 'INVALID_FIELD', 400);
    }
    updates.active = body.active;
  }

  if ('retail_price' in body) {
    const rp = Number(body.retail_price);
    if (!Number.isInteger(rp) || rp < 0) {
      return apiError('retail_price must be a non-negative integer (cents).', 'INVALID_FIELD', 400);
    }
    updates.retail_price = rp;

    // Recalculate markup_pct from current wholesale price
    const [currentRows] = await pool.execute<
      Array<{ wholesale_price: number }>
    >('SELECT wholesale_price FROM products WHERE id = ?', [id]);

    if (currentRows.length === 0) {
      return apiError('Product not found.', 'NOT_FOUND', 404);
    }

    const wholesale = currentRows[0].wholesale_price;
    updates.markup_pct = wholesale > 0 ? Math.round((rp / wholesale) * 100) : 0;
  }

  if (Object.keys(updates).length === 1) {
    // Only updated_at — nothing to update
    return apiError('No valid fields to update.', 'NO_UPDATES', 400);
  }

  try {
    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), id];

    const [result] = await pool.execute(
      `UPDATE products SET ${setClauses} WHERE id = ?`,
      values
    );

    const updateResult = result as { affectedRows: number };
    if (updateResult.affectedRows === 0) {
      return apiError('Product not found.', 'NOT_FOUND', 404);
    }

    // Fetch the updated row
    const [updatedRows] = await pool.execute<
      Array<{ id: string; name: string; category: string; wholesale_price: number; retail_price: number; markup_pct: number; active: number; updated_at: string }>
    >('SELECT id, name, category, wholesale_price, retail_price, markup_pct, active, updated_at FROM products WHERE id = ?', [id]);

    if (updatedRows.length === 0) {
      return apiError('Product not found after update.', 'NOT_FOUND', 404);
    }

    const updated = updatedRows[0];
    return apiOk({
      product: {
        id: updated.id,
        name: updated.name,
        category: updated.category,
        wholesalePriceUSD: (updated.wholesale_price / 100).toFixed(2),
        retailPriceUSD: (updated.retail_price / 100).toFixed(2),
        markupPct: updated.markup_pct,
        active: !!updated.active,
        updated_at: updated.updated_at,
      },
    });
  } catch (err) {
    console.error('[admin/products/:id] Unexpected error:', err);
    return apiError('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
  }
};