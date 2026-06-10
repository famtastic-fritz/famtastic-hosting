/**
 * GET /api/admin/products
 *
 * Full product catalog from Supabase products table.
 * Shows wholesale price, retail price, markup %, and active status.
 * Data seeded by supabase/seed.sql (Track 7) from BUILD-SPEC.md pricing.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/auth/middleware.js';
import { apiOk, apiError } from '../../../../lib/api/response.js';
import { supabaseAdmin } from '../../../../lib/supabase/client.js';

export const GET: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('[admin/products] Supabase error:', error.message);
      return apiError('Failed to fetch product catalog.', 'DB_ERROR', 500);
    }

    return apiOk({
      products: (products ?? []).map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        godaddy_product_id: p.godaddy_product_id,
        wholesalePriceUSD: (p.wholesale_price / 100).toFixed(2),
        retailPriceUSD: (p.retail_price / 100).toFixed(2),
        markupPct: p.markup_pct,
        active: p.active,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
    });
  } catch (err) {
    console.error('[admin/products] Unexpected error:', err);
    return apiError('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
  }
};
