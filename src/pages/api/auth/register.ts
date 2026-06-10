/**
 * POST /api/auth/register
 *
 * Creates a new customer account in MySQL:
 *   1. Hashes the password with bcrypt
 *   2. Inserts a row into users with role='customer'
 *   3. Creates a session row and sets the fam_session cookie
 *
 * Request body (JSON):
 *   { email: string; password: string; name?: string }
 *
 * Response (201):
 *   { ok: true; user: { id, email, role } }
 *
 * Response (400/409/429):
 *   { ok: false; error: string; code: string }
 */

import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db/pool.js';
import {
  hashRateLimit,
  rateLimitResetSeconds,
  buildSetCookieHeader,
  getClientIP,
} from '../../../lib/auth/helpers.js';
import crypto from 'node:crypto';

export const prerender = false;

// Minimum password length
const MIN_PASSWORD_LENGTH = 8;

// Basic email regex
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  // ── Validate ──────────────────────────────────────────────────────────────
  const errors: string[] = [];
  if (!email) errors.push('Email is required.');
  else if (!EMAIL_RE.test(email)) errors.push('Invalid email address.');
  if (!password) errors.push('Password is required.');
  else if (password.length < MIN_PASSWORD_LENGTH)
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);

  if (errors.length > 0) {
    return json({ ok: false, error: errors[0], code: 'VALIDATION_ERROR', errors }, 400);
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  const ip = getClientIP(request);
  if (hashRateLimit(ip, 'register')) {
    const reset = rateLimitResetSeconds(ip, 'register');
    return json(
      {
        ok: false,
        error: `Too many registration attempts. Try again in ${reset} second${reset !== 1 ? 's' : ''}.`,
        code: 'RATE_LIMITED',
      },
      429
    );
  }

  // ── Check if email already exists ─────────────────────────────────────────
  const [existing] = await pool.execute<Array<{ id: string }>>(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );

  if (existing.length > 0) {
    return json(
      { ok: false, error: 'An account with this email already exists.', code: 'EMAIL_TAKEN' },
      409
    );
  }

  // ── Hash password and insert user ─────────────────────────────────────────
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash(password, 12);
  const userId = crypto.randomUUID();

  try {
    await pool.execute(
      'INSERT INTO users (id, email, password_hash, role, godaddy_shopper_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [userId, email, passwordHash, 'customer', null]
    );
  } catch (insertError: any) {
    // Duplicate email — race condition between SELECT and INSERT
    if (insertError?.code === 'ER_DUP_ENTRY') {
      return json(
        { ok: false, error: 'An account with this email already exists.', code: 'EMAIL_TAKEN' },
        409
      );
    }
    console.error('[register] Insert error:', insertError);
    return json(
      { ok: false, error: 'Registration failed. Please try again.', code: 'DB_ERROR' },
      500
    );
  }

  // ── Create session and set cookie ────────────────────────────────────────
  const sessionId = crypto.randomUUID();
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

  await pool.execute(
    'INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())',
    [sessionId, userId, sessionToken, expiresAt]
  );

  const cookie = buildSetCookieHeader(sessionToken, import.meta.env.PROD);

  return new Response(
    JSON.stringify({
      ok: true,
      user: { id: userId, email, role: 'customer' as const },
      redirectTo: '/dashboard',
    }),
    {
      status: 201,
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