/**
 * Auth middleware for Astro API routes and server-rendered pages.
 *
 * Three exported functions:
 *   requireAuth(request)   — reads fam_session cookie, queries MySQL sessions
 *                            table joined with users, returns AuthUser or JSON 401
 *   requireAdmin(request)  — same as requireAuth but also checks role='admin',
 *                            returns JSON 401/403 for API callers
 *   getSession(request)    — returns session without redirecting (optional auth)
 *
 * Session flow:
 *   1. Client sends the `fam_session` httpOnly cookie with every request.
 *   2. We extract the session token from the cookie, query the `sessions`
 *      table (joined with `users`) to validate it and load the user's data.
 *   3. On success we return an AuthUser. On failure we return JSON auth errors or null.
 *
 * The `sessions` table is expected to have this schema:
 *   CREATE TABLE sessions (
 *     id         CHAR(36) PRIMARY KEY,           -- UUID session id
 *     user_id    CHAR(36) NOT NULL,              -- FK → users.id
 *     token      VARCHAR(255) NOT NULL,          -- opaque session token
 *     expires_at DATETIME NOT NULL,
 *     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 *     INDEX idx_sessions_token  (token),
 *     INDEX idx_sessions_user   (user_id)
 *   );
 */

import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../db/pool.js';

// ─── Session cookie name ──────────────────────────────────────────────────────

export const SESSION_COOKIE = 'fam_session';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: 'customer' | 'admin';
}

// Backward-compatible alias used by GoDaddy route stubs
export type AuthSession = AuthUser;

// ─── Internal: extract & validate session from cookie ────────────────────────

interface SessionRow extends RowDataPacket {
  s_id: string;
  s_token: string;
  s_expires_at: Date;
  u_id: string;
  u_email: string;
  u_role: 'customer' | 'admin';
}

async function extractSession(request: Request): Promise<AuthUser | null> {
  const cookieHeader = request.headers.get('Cookie') ?? '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;

  // The cookie value is the session token (opaque string)
  const token = decodeURIComponent(match[1]).trim();
  if (!token) return null;

  try {
    const [rows] = await pool.query<SessionRow[]>(
      `SELECT s.session_id AS s_id, s.data AS s_data, s.expires AS s_expires,
              u.id AS u_id, u.email AS u_email, u.role AS u_role
       FROM sessions s
       JOIN users u ON u.id = JSON_EXTRACT(s.data, '$.user_id')
       WHERE s.session_id = ?
         AND s.expires > UNIX_TIMESTAMP(NOW())`,
      [token]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id:    String(row.u_id),
      email: row.u_email,
      role:  row.u_role,
    };
  } catch (err) {
    console.error('[auth] session lookup failed:', err);
    return null;
  }
}

// ─── requireAuth ─────────────────────────────────────────────────────────────

/**
 * Extracts the session from the request cookie and validates it against MySQL.
 * Returns an AuthUser if authenticated, or a JSON 401 Response.
 *
 * Usage in an Astro API route:
 *   const authResult = await requireAuth(Astro.request);
 *   if (authResult instanceof Response) return authResult;
 *   // authResult is AuthUser
 */
export async function requireAuth(request: Request): Promise<AuthUser | Response> {
  const user = await extractSession(request);
  if (!user) {
    return unauthorizedResponse();
  }
  return user;
}

// Extract session without redirect — used by Astro middleware
export { extractSession };

// ─── requireAdmin ─────────────────────────────────────────────────────────────

/**
 * Same as requireAuth but additionally enforces role === 'admin'.
 * Returns JSON 401/403 errors for API callers.
 */
export async function requireAdmin(request: Request): Promise<AuthUser | Response> {
  const user = await extractSession(request);
  if (!user) {
    return unauthorizedResponse();
  }
  if (user.role !== 'admin') {
    return forbiddenResponse();
  }
  return user;
}

// ─── getSession ───────────────────────────────────────────────────────────────

/**
 * Returns the AuthUser if a valid session exists, or null if not authenticated.
 * Does NOT redirect — use this for optional auth.
 */
export async function getSession(request: Request): Promise<AuthUser | null> {
  return extractSession(request);
}

// ─── Backward-compatible helpers used by Track 2 GoDaddy route stubs ─────────

/**
 * Returns AuthUser or null (no redirect).
 */
export async function requireAuthOrNull(request: Request): Promise<AuthUser | null> {
  return extractSession(request);
}

// ─── Standard error responses (re-exported for consumers) ────────────────────

export function unauthorizedResponse(message = 'Unauthorized'): Response {
  return new Response(
    JSON.stringify({ error: message, code: 'UNAUTHORIZED' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}

export function forbiddenResponse(message = 'Forbidden'): Response {
  return new Response(
    JSON.stringify({ error: message, code: 'FORBIDDEN' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  );
}