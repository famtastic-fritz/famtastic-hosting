/**
 * POST /api/auth/register
 *
 * Creates a new customer account via Supabase Auth, then inserts a row
 * into public.users with role='customer'.
 *
 * Request body (JSON):
 *   { email: string; password: string; name?: string }
 *
 * Response (201):
 *   { ok: true; user: { id, email, role } }
 *
 * Response (400/409/429):
 *   { ok: false; error: string; code: string }
 *
 * Note: GoDaddy storefront handles payment/provisioning. Registration here
 * creates the portal login. GoDaddy order data is synced later via postback.
 */

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase/client.js';
import {
  hashRateLimit,
  rateLimitResetSeconds,
  buildSetCookieHeader,
  getClientIP,
} from '../../../lib/auth/helpers.js';

export const prerender = false;

// Minimum password length
const MIN_PASSWORD_LENGTH = 8;

// Basic email regex — Supabase will do the authoritative check
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

  // ── Create Supabase auth user ─────────────────────────────────────────────
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,   // Auto-confirm for portal-first flow
  });

  if (error) {
    if (error.message.toLowerCase().includes('already registered') ||
        error.message.toLowerCase().includes('already exists')) {
      return json(
        { ok: false, error: 'An account with this email already exists.', code: 'EMAIL_TAKEN' },
        409
      );
    }
    console.error('[register] Supabase auth error:', error.message);
    return json(
      { ok: false, error: 'Registration failed. Please try again.', code: 'AUTH_ERROR' },
      500
    );
  }

  if (!data.user) {
    return json({ ok: false, error: 'Registration failed.', code: 'AUTH_ERROR' }, 500);
  }

  // ── Insert into public.users ──────────────────────────────────────────────
  const { error: insertError } = await supabaseAdmin.from('users').insert({
    id: data.user.id,
    email,
    role: 'customer',
    godaddy_shopper_id: null,
  });

  if (insertError) {
    // Clean up the auth user if the profile insert fails
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    console.error('[register] Profile insert error:', insertError.message);
    return json(
      { ok: false, error: 'Registration failed. Please try again.', code: 'DB_ERROR' },
      500
    );
  }

  // ── Sign in to get a session ──────────────────────────────────────────────
  const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !sessionData.session) {
    // Account created, but couldn't auto-login — redirect to login page
    return json(
      {
        ok: true,
        user: { id: data.user.id, email, role: 'customer' as const },
        redirectTo: '/dashboard/login',
        message: 'Account created. Please sign in.',
      },
      201
    );
  }

  // ── Auto-login: set session cookie ────────────────────────────────────────
  const cookie = buildSetCookieHeader(
    {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
    },
    import.meta.env.PROD
  );

  return new Response(
    JSON.stringify({
      ok: true,
      user: { id: data.user.id, email, role: 'customer' as const },
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
