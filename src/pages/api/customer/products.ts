export const prerender = false;

/**
 * GET /api/customer/products
 * 
 * Return active products (for storefront browsing).
 * Auth required: customer or admin.
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/db/pool.js';
import { requireAuth } from '../../../lib/auth/middleware.js';

interface ProductRow {
  id: number;
  godaddy_product_id: string;
  name: string;
  category: string;
  wholesale_price_cents: number;
  retail_price_cents: number;
  markup_pct: number;
  billing_period: string;
}

export const GET: APIRoute = async ({ request }) => {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const [rows] = await query<ProductRow[]>(
      `SELECT id, godaddy_product_id, name, category, 
              wholesale_price_cents, retail_price_cents, markup_pct, billing_period
       FROM products
       WHERE active = TRUE
       ORDER BY category ASC, name ASC`
    );

    const products = rows.map((row) => ({
      id: row.id,
      godaddyId: row.godaddy_product_id,
      name: row.name,
      category: row.category,
      wholesalePrice: row.wholesale_price_cents / 100,
      retailPrice: row.retail_price_cents / 100,
      markupPct: row.markup_pct,
      billingPeriod: row.billing_period,
    }));

    return new Response(
      JSON.stringify({ success: true, data: { products } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[products] error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch products' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
