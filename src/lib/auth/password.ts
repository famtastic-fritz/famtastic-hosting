/**
 * Password hashing and validation — bcrypt-backed
 *
 * Exported functions:
 *   hashPassword(plain)     — bcrypt hash (cost 10)
 *   verifyPassword(plain, hash) — constant-time comparison
 */

import bcrypt from 'bcrypt';

const BCRYPT_COST = 10;

/**
 * Hash a plaintext password with bcrypt (cost 10).
 * Throws if bcrypt fails.
 */
export async function hashPassword(plain: string): Promise<string> {
  const hash = await bcrypt.hash(plain, BCRYPT_COST);
  return hash;
}

/**
 * Verify a plaintext password against a bcrypt hash.
 * Returns true if match, false otherwise.
 * Throws if bcrypt fails.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  const match = await bcrypt.compare(plain, hash);
  return match;
}

/**
 * Generate a random session token (opaque string for cookie).
 * 64 random bytes = 128 hex characters.
 */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
