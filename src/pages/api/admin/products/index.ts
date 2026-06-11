/**
 * GET /api/admin/products
 *
 * Full product catalog from MySQL products table.
 * Shows wholesale price, retail price, markup %, and active status.
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
      Array<{ id: string; name: string; category: string; godaddy_product_id: string | null; wholesale_price_cents: number; retail_price_cents: number; markup_pct: number; active: number; created_at: string; updated_at: string }>
    >(
      'SELECT id, name, category, godaddy_product_id, wholesale_price_cents, retail_price_cents, markup_pct, active, created_at, updated_at FROM products ORDER BY category ASC, name ASC'
    );

    return apiOk({
      products: (products ?? []).map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        godaddy_product_id: p.godaddy_product_id,
        wholesalePriceUSD: (p.wholesale_price_cents / 100).toFixed(2),
        retailPriceUSD: (p.retail_price_cents / 100).toFixed(2),
        markupPct: p.markup_pct,
        active: !!p.active,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
    });
  } catch (err) {
    console.error('[admin/products] Unexpected error:', err);
    return apiError('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
  }
};