/**
 * POST /api/auth/login
 *
 * Authenticates a customer with email + password via Supabase.
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
import { supabaseAdmin } from '../../../lib/supabase/client.js';
import {
  hashRateLimit,
  clearRateLimit,
  rateLimitResetSeconds,
  buildSetCookieHeader,
  getClientIP,
} from '../../../lib/auth/helpers.js';

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

  // ── Supabase auth ─────────────────────────────────────────────────────────
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    // Don't reveal whether the account exists — generic message
    return json(
      { ok: false, error: 'Invalid email or password.', code: 'AUTH_FAILED' },
      401
    );
  }

  // ── Fetch role from public.users ──────────────────────────────────────────
  const { data: userRow, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email, role')
    .eq('id', data.user.id)
    .single();

  if (userError || !userRow) {
    // Auth succeeded but no matching row in public.users — shouldn't happen
    // unless registration is incomplete
    return json(
      { ok: false, error: 'Account setup incomplete. Please contact support.', code: 'USER_NOT_FOUND' },
      500
    );
  }

  // ── Clear rate limit on success ───────────────────────────────────────────
  clearRateLimit(ip, 'login');

  // ── Build response with session cookie ───────────────────────────────────
  const redirectTo = userRow.role === 'admin' ? '/admin' : '/dashboard';
  const cookie = buildSetCookieHeader(
    {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
    import.meta.env.PROD
  );

  return new Response(
    JSON.stringify({
      ok: true,
      user: { id: userRow.id, email: userRow.email, role: userRow.role },
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
