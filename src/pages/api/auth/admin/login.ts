/**
 * POST /api/auth/admin/login
 *
 * Admin-only login route. Authenticates against MySQL, then enforces
 * role === 'admin'. Returns 403 if the user exists but is not an admin.
 *
 * Separate from /api/auth/login so admin brute-force rate limits are
 * isolated from customer login rate limits.
 *
 * Request body (JSON):
 *   { email: string; password: string }
 *
 * Response (200):
 *   { ok: true; user: { id, email, role: 'admin' }; redirectTo: '/admin' }
 *
 * Response (400/401/403/429):
 *   { ok: false; error: string; code: string }
 */

import type { APIRoute } from 'astro';
import { pool } from '../../../../lib/db/pool.js';
import { verifyPassword } from '../../../../lib/auth/password.js';
import {
  hashRateLimit,
  clearRateLimit,
  rateLimitResetSeconds,
  buildSetCookieHeader,
  getClientIP,
} from '../../../../lib/auth/helpers.js';
import crypto from 'node:crypto';

export const prerender = false;

const RATE_LIMIT_ACTION = 'admin_login';

export const POST: APIRoute = async ({ request }) => {
  // ── Parse body ────────────────────────────────────────────────────────────
  let email: string;
  let password: string;

  try {
    const body = await request.json() as { email?: unknown; password?: unknown };
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return json({ ok: false, error: 'Invalid request body.', code: 'BAD_REQUEST' }, 400);
  }

  if (!email || !password) {
    return json({ ok: false, error: 'Email and password are required.', code: 'VALIDATION_ERROR' }, 400);
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  const ip = getClientIP(request);
  if (hashRateLimit(ip, RATE_LIMIT_ACTION)) {
    const reset = rateLimitResetSeconds(ip, RATE_LIMIT_ACTION);
    return json(
      {
        ok: false,
        error: `Too many attempts. Try again in ${reset} second${reset !== 1 ? 's' : ''}.`,
        code: 'RATE_LIMITED',
      },
      429
    );
  }

  // ── Look up user in MySQL ─────────────────────────────────────────────────
  const [rows] = await pool.execute<
    Array<{ id: string; email: string; role: string; password_hash: string }>
  >(
    'SELECT id, email, role, password_hash FROM users WHERE email = ?',
    [email]
  );

  if (rows.length === 0) {
    return json(
      { ok: false, error: 'Invalid credentials.', code: 'AUTH_FAILED' },
      401
    );
  }

  const user = rows[0];

  // ── Verify password (bcrypt) ──────────────────────────────────────────────
  const passwordMatch = await verifyPassword(password, user.password_hash);

  if (!passwordMatch) {
    return json(
      { ok: false, error: 'Invalid credentials.', code: 'AUTH_FAILED' },
      401
    );
  }

  // ── Verify admin role ──────────────────────────────────────────────────────
  if (user.role !== 'admin') {
    return json(
      { ok: false, error: 'Invalid credentials.', code: 'FORBIDDEN' },
      403
    );
  }

  // ── Create session ───────────────────────────────────────────────────────
  const sessionToken = crypto.randomBytes(64).toString('hex');
  const expiresUnix = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

  await pool.execute(
    'INSERT INTO sessions (session_id, expires, data) VALUES (?, ?, ?)',
    [sessionToken, expiresUnix, JSON.stringify({ user_id: parseInt(user.id, 10) })]
  );

  // ── Clear rate limit on success ───────────────────────────────────────────
  clearRateLimit(ip, RATE_LIMIT_ACTION);

  // ── Build response with session cookie ───────────────────────────────────
  const cookie = buildSetCookieHeader(sessionToken, import.meta.env.PROD);

  return new Response(
    JSON.stringify({
      ok: true,
      user: { id: user.id, email: user.email, role: 'admin' as const },
      redirectTo: '/admin',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    }
  );
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}