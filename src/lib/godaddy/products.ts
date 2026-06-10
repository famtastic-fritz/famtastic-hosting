/**
 * GoDaddy Product Catalog
 * SERVER-SIDE ONLY.
 *
 * NOTE ON GODADDY PRODUCT API:
 * Standard sso-key access does NOT have reliable access to GoDaddy's
 * product catalog API endpoints (/v1/catalogs). For MVP, our product
 * data lives in src/data/products.json — that file is the single source
 * of truth for pricing, features, and product names.
 *
 * This module provides:
 *   1. A typed interface to our local products.json data
 *   2. A future shim for when GoDaddy catalog API access is available
 *   3. The 5-minute cache layer already wired into the client
 */

import { cache, CACHE_TTL } from './client.js';
import type { GoDaddyProduct } from './types.js';

// ─── Local Product Catalog Types ──────────────────────────────────────────────

export interface LocalProduct {
  name: string;
  price: number;
  annualPrice?: number;
  period: 'mo' | 'yr';
  features: string[];
  // Mapped from the GoDaddy API when available
  godaddyProductId?: number;
  godaddyNamespace?: string;
}

export interface LocalDomainProduct {
  tld: string;
  price: number;
  period: 'yr';
}

export interface LocalProductCatalog {
  wordpress: {
    basic: LocalProduct;
    ultimate: LocalProduct;
  };
  hosting: {
    starter: LocalProduct;
    ultimate: LocalProduct;
  };
  builder: {
    essential: LocalProduct;
    commerce: LocalProduct;
  };
  servers: {
    launch: LocalProduct;
    expand: LocalProduct;
  };
  domains: {
    com: LocalDomainProduct;
    net: LocalDomainProduct;
    org: LocalDomainProduct;
    co: LocalDomainProduct;
  };
  email: {
    pro: LocalProduct;
    group: LocalProduct;
    m365: LocalProduct;
  };
  ssl: {
    standard: LocalProduct;
  };
}

// ─── Load Local Product Catalog ───────────────────────────────────────────────

const LOCAL_CACHE_KEY = 'local:products:catalog';

/**
 * Load the local product catalog from src/data/products.json.
 * Cached for 5 minutes (same TTL as would be used for GoDaddy catalog API calls).
 *
 * This is the MVP implementation. When GoDaddy catalog API access becomes
 * available, this function will merge local pricing data with GoDaddy
 * wholesale prices for margin calculations.
 */
export async function listProducts(): Promise<LocalProductCatalog> {
  const cached = cache.get<LocalProductCatalog>(LOCAL_CACHE_KEY);
  if (cached) return cached;

  // Dynamic import to avoid bundling into client-side code
  // In Astro SSR/API routes, this is server-side only
  const { default: products } = await import('../../data/products.json', {
    assert: { type: 'json' },
  });

  const catalog = products as LocalProductCatalog;
  cache.set(LOCAL_CACHE_KEY, catalog, CACHE_TTL.PRODUCTS);
  return catalog;
}

/**
 * Get a flat list of all products for admin display.
 * Returns each product with its category and tier key.
 */
export async function listProductsFlat(): Promise<
  Array<{
    category: string;
    tier: string;
    product: LocalProduct | LocalDomainProduct;
  }>
> {
  const catalog = await listProducts();
  const result: Array<{
    category: string;
    tier: string;
    product: LocalProduct | LocalDomainProduct;
  }> = [];

  for (const [category, tiers] of Object.entries(catalog)) {
    for (const [tier, product] of Object.entries(tiers)) {
      result.push({ category, tier, product: product as LocalProduct | LocalDomainProduct });
    }
  }

  return result;
}

// ─── Future: GoDaddy Catalog API Integration ──────────────────────────────────
// When sso-key access to /v1/catalogs becomes available, this stub will be
// implemented to fetch wholesale pricing for margin calculations.

/**
 * Fetch GoDaddy's wholesale product catalog.
 * STUB — GoDaddy catalog endpoints are not reliably available with standard
 * sso-key access. Uncomment and implement when reseller catalog API access
 * is confirmed.
 */
export async function fetchGoDaddyCatalog(): Promise<GoDaddyProduct[]> {
  // TODO: Implement when GoDaddy catalog API access is confirmed
  // The endpoint would be something like:
  //   GET /v1/catalogs/{catalogId}/products
  // For now, return empty array so callers don't break.
  console.warn('[GoDaddy Products] Catalog API not yet available. Using local product data.');
  return [];
}

/**
 * Invalidate the product catalog cache.
 * Call this if product data in products.json has been updated.
 */
export function invalidateProductCache(): void {
  cache.invalidate(LOCAL_CACHE_KEY);
}
