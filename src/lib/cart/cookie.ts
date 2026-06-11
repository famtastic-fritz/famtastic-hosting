/**
 * Cart cookie helpers — FAMtastic Hosting
 *
 * The cart session is stored as a plain hex token in the "fam_cart_session"
 * cookie. httpOnly is intentionally false so JavaScript (CartButton, CartDrawer)
 * can read it for optimistic UI updates.
 */

import { randomBytes } from 'node:crypto';

export const CART_COOKIE = 'fam_cart_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Extract the cart session ID from the Cookie header.
 * Returns null if the cookie is absent or empty.
 */
export function getCartSession(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie') ?? '';
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${CART_COOKIE}=([^;]+)`),
  );
  if (!match) return null;
  const value = decodeURIComponent(match[1]).trim();
  return value || null;
}

// ─── Generate ─────────────────────────────────────────────────────────────────

/**
 * Generate a new 64-byte (128-char hex) cart session token.
 */
export function generateCartSession(): string {
  return randomBytes(64).toString('hex');
}

// ─── Set-Cookie header ────────────────────────────────────────────────────────

/**
 * Build a Set-Cookie header value for the cart session cookie.
 * httpOnly=false — JS must read it for cart badge counts.
 * Secure flag is added only in production (NODE_ENV=production).
 */
export function buildCartCookieHeader(sessionId: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const parts = [
    `${CART_COOKIE}=${encodeURIComponent(sessionId)}`,
    `Max-Age=${MAX_AGE}`,
    'Path=/',
    'SameSite=Lax',
  ];
  if (isProduction) parts.push('Secure');
  return parts.join('; ');
}
