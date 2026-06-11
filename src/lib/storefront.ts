/**
 * Product CTA URL helpers for FAMtastic Hosting
 *
 * Maps product slugs to destination URLs for "Buy Now" / "Get Started" CTAs.
 * store.famtastichosting.com is suspended — all slugs currently map to local
 * product pages (see storefront-urls.json). Once per-product Add to Cart is
 * wired, update each slug's URL to /api/cart/add?productId=<id>.
 */

import storefrontUrls from '../data/storefront-urls.json';

// Strip the internal _note key from the lookup type
type StorefrontMap = Omit<typeof storefrontUrls, '_note'>;
type ProductSlug = keyof StorefrontMap;

const BASE_STOREFRONT = '/contact';

/**
 * Returns the storefront URL for a given product slug.
 * Falls back to the storefront homepage if the slug is not mapped.
 *
 * @example
 * getStorefrontURL('wordpress-basic')
 * // → "https://store.famtastichosting.com/hosting/wordpress-hosting"
 */
export function getStorefrontURL(productSlug: string): string {
  const map = storefrontUrls as Record<string, string>;
  return map[productSlug] ?? BASE_STOREFRONT;
}

/**
 * Builds a checkout URL for a product with an optional promo/coupon code.
 * GoDaddy storefront accepts `isc` as the promo code query parameter.
 *
 * @example
 * buildCheckoutURL('wordpress-basic', 'LAUNCH20')
 * // → "https://store.famtastichosting.com/hosting/wordpress-hosting?isc=LAUNCH20"
 */
export function buildCheckoutURL(productSlug: string, _promoCode?: string): string {
  // Promo codes were GoDaddy ISC params — not applicable to local routing.
  return getStorefrontURL(productSlug);
}

/**
 * Type-safe lookup — returns undefined if the slug is not in the map.
 * Useful when you want to check existence before linking.
 */
export function findStorefrontURL(productSlug: string): string | undefined {
  const map = storefrontUrls as Record<string, string>;
  const url = map[productSlug];
  // Exclude the _note key
  return url && productSlug !== '_note' ? url : undefined;
}

/**
 * All registered product slugs (excludes the internal _note key).
 */
export function getRegisteredSlugs(): string[] {
  return Object.keys(storefrontUrls).filter((k) => k !== '_note');
}

export { BASE_STOREFRONT };
