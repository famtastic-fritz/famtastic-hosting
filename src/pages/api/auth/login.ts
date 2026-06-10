/**
 * POST /api/auth/login
 *
 * Authenticates a customer with email + password against MySQL.
 * Sets the fam_session httpOnly cookie on success.
 *
 * Request body (JSON):
 *   { email: string; password: string }
 *
 * Response (200):
 *   { ok: true; user: { id, email, role }; redirectTo: string }
 *
 * Response (400/401/429):
 *   { ok: false; error: string; code: string }
 */

import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db/pool.js';
import {
  hashRateLimit,
  clearRateLimit,
  rateLimitResetSeconds,
  buildSetCookieHeader,
  getClientIP,
} from '../../../lib/auth/helpers.js';
import crypto from 'node:crypto';

export const prerender = false;

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
  if (hashRateLimit(ip, 'login')) {
    const reset = rateLimitResetSeconds(ip, 'login');
    return json(
      {
        ok: false,
        error: `Too many login attempts. Try again in ${reset} second${reset !== 1 ? 's' : ''}.`,
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
    // Don't reveal whether the account exists — generic message
    return json(
      { ok: false, error: 'Invalid email or password.', code: 'AUTH_FAILED' },
      401
    );
  }

  const user = rows[0];

  // ── Verify password (bcrypt) ──────────────────────────────────────────────
  const bcrypt = await import('bcryptjs');
  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    return json(
      { ok: false, error: 'Invalid email or password.', code: 'AUTH_FAILED' },
      401
    );
  }

  // ── Create session ───────────────────────────────────────────────────────
  const sessionId = crypto.randomUUID();
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

  await pool.execute(
    'INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())',
    [sessionId, user.id, sessionToken, expiresAt]
  );

  // ── Clear rate limit on success ───────────────────────────────────────────
  clearRateLimit(ip, 'login');

  // ── Build response with session cookie ───────────────────────────────────
  const redirectTo = user.role === 'admin' ? '/admin' : '/dashboard';
  const cookie = buildSetCookieHeader(sessionToken, import.meta.env.PROD);

  return new Response(
    JSON.stringify({
      ok: true,
      user: { id: user.id, email: user.email, role: user.role },
      redirectTo,
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