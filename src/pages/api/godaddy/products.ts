/**
 * GET /api/godaddy/products
 *
 * Returns the product catalog.
 *
 * MVP: Data comes from src/data/products.json (our single source of truth for pricing).
 * Future: Will merge with GoDaddy wholesale pricing for margin calculations.
 *
 * Auth: Public endpoint — product pricing is visible to anyone.
 * (Wholesale pricing is NOT included in this response.)
 *
 * Query parameters:
 *   category   - filter by product category (wordpress, hosting, builder, servers, domains, email, ssl)
 *   flat       - set to "true" to return a flat array instead of nested object
 *   skipCache  - set to "true" to bypass 5-minute cache
 */

import type { APIRoute } from 'astro';
import { listProducts, listProductsFlat } from '../../../lib/godaddy/products.js';
import { apiOk, apiError, handleGoDaddyError } from '../../../lib/api/response.js';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const url = new URL(context.request.url);
  const category = url.searchParams.get('category')?.toLowerCase();
  const flat = url.searchParams.get('flat') === 'true';

  try {
    if (flat) {
      const allProducts = await listProductsFlat();
      if (category) {
        const filtered = allProducts.filter((p) => p.category === category);
        if (filtered.length === 0) {
          return apiError(`No products found for category: ${category}`, 'NOT_FOUND', 404);
        }
        return apiOk(filtered);
      }
      return apiOk(allProducts);
    }

    const catalog = await listProducts();

    if (category) {
      const categoryData = (catalog as Record<string, unknown>)[category];
      if (!categoryData) {
        return apiError(
          `Unknown category: ${category}. Valid categories: wordpress, hosting, builder, servers, domains, email, ssl`,
          'NOT_FOUND',
          404
        );
      }
      return apiOk(categoryData);
    }

    return apiOk(catalog);
  } catch (err) {
    return handleGoDaddyError(err);
  }
};
