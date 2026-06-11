/**
 * GET /api/admin/products
 *
 * Full product catalog from MySQL products table.
 * Shows wholesale price, retail price, markup %, and active status.
 *
 * POST /api/admin/products
 *
 * Insert a new product into the catalog.
 * Body: { godaddy_product_id, name, category, wholesale_price_cents,
 *         retail_price_cents, markup_pct, billing_period }
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/auth/middleware.js';
import { apiOk, apiError } from '../../../../lib/api/response.js';
import { pool } from '../../../../lib/db/pool.js';

export const GET: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const [products] = await pool.execute<
      Array<{ id: string; name: string; category: string; godaddy_product_id: string | null; wholesale_price: number; retail_price: number; markup_pct: number; active: number; billing_period: string | null; created_at: string; updated_at: string }>
    >(
      'SELECT id, name, category, godaddy_product_id, wholesale_price, retail_price, markup_pct, active, billing_period, created_at, updated_at FROM products ORDER BY category ASC, name ASC'
    );

    return apiOk({
      products: (products ?? []).map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        godaddy_product_id: p.godaddy_product_id,
        wholesalePriceUSD: (p.wholesale_price / 100).toFixed(2),
        retailPriceUSD: (p.retail_price / 100).toFixed(2),
        markupPct: p.markup_pct,
        active: !!p.active,
        billing_period: p.billing_period ?? null,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
    });
  } catch (err) {
    console.error('[admin/products GET] Unexpected error:', err);
    return apiError('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError('Invalid JSON body.', 'INVALID_JSON', 400);
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';

  if (!name)     return apiError('name is required.',     'MISSING_FIELD', 400);
  if (!category) return apiError('category is required.', 'MISSING_FIELD', 400);

  const wholesaleCents = Number(body.wholesale_price_cents ?? 0);
  const retailCents    = Number(body.retail_price_cents    ?? 0);

  if (!Number.isInteger(wholesaleCents) || wholesaleCents < 0) {
    return apiError('wholesale_price_cents must be a non-negative integer.', 'INVALID_FIELD', 400);
  }
  if (!Number.isInteger(retailCents) || retailCents < 0) {
    return apiError('retail_price_cents must be a non-negative integer.', 'INVALID_FIELD', 400);
  }

  const godaddyProductId = typeof body.godaddy_product_id === 'string'
    ? body.godaddy_product_id.trim() || null
    : null;

  const markupPct = typeof body.markup_pct === 'number'
    ? body.markup_pct
    : (wholesaleCents > 0 ? Math.round((retailCents / wholesaleCents) * 100) : 0);

  const billingPeriod = typeof body.billing_period === 'string'
    ? body.billing_period.trim() || null
    : null;

  try {
    const [result] = await pool.execute(
      `INSERT INTO products
         (godaddy_product_id, name, category, wholesale_price, retail_price, markup_pct, billing_period, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [godaddyProductId, name, category, wholesaleCents, retailCents, markupPct, billingPeriod]
    );

    const insertResult = result as { insertId: number };

    const [rows] = await pool.execute<
      Array<{ id: string; name: string; category: string; godaddy_product_id: string | null; wholesale_price: number; retail_price: number; markup_pct: number; active: number; billing_period: string | null; created_at: string; updated_at: string }>
    >(
      'SELECT id, name, category, godaddy_product_id, wholesale_price, retail_price, markup_pct, active, billing_period, created_at, updated_at FROM products WHERE id = ?',
      [insertResult.insertId]
    );

    if (rows.length === 0) {
      return apiError('Product created but could not be retrieved.', 'INTERNAL_ERROR', 500);
    }

    const p = rows[0];
    return apiOk(
      {
        product: {
          id: p.id,
          name: p.name,
          category: p.category,
          godaddy_product_id: p.godaddy_product_id,
          wholesalePriceUSD: (p.wholesale_price / 100).toFixed(2),
          retailPriceUSD: (p.retail_price / 100).toFixed(2),
          markupPct: p.markup_pct,
          active: !!p.active,
          billing_period: p.billing_period,
          created_at: p.created_at,
          updated_at: p.updated_at,
        },
      },
      201
    );
  } catch (err) {
    console.error('[admin/products POST] Unexpected error:', err);
    return apiError('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
  }
};