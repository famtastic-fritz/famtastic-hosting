/**
 * POST /api/auth/admin/login
 *
 * Admin-only login route. Authenticates via Supabase, then enforces
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
import { supabaseAdmin } from '../../../../lib/supabase/client.js';
import type { UserRow } from '../../../../lib/supabase/types.js';
import {
  hashRateLimit,
  clearRateLimit,
  rateLimitResetSeconds,
  buildSetCookieHeader,
  getClientIP,
} from '../../../../lib/auth/helpers.js';

export const prerender = false;

// Stricter rate limit for admin login — 5 attempts/min same as customer
// but tracked under a separate action key ('admin_login') so they don't share buckets
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

  // ── Supabase auth ─────────────────────────────────────────────────────────
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    return json(
      { ok: false, error: 'Invalid credentials.', code: 'AUTH_FAILED' },
      401
    );
  }

  // ── Verify admin role ─────────────────────────────────────────────────────
  const { data: rawUser, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email, role')
    .eq('id', data.user.id)
    .single();
  // Cast through unknown — Supabase generic inference can narrow to 'never'
  const userRow = rawUser as unknown as Pick<UserRow, 'id' | 'email' | 'role'> | null;

  if (userError || !userRow) {
    return json(
      { ok: false, error: 'Account not found.', code: 'USER_NOT_FOUND' },
      401
    );
  }

  if (userRow.role !== 'admin') {
    // Auth succeeded but user is not admin — don't hint at account existence
    return json(
      { ok: false, error: 'Invalid credentials.', code: 'FORBIDDEN' },
      403
    );
  }

  // ── Clear rate limit on success ───────────────────────────────────────────
  clearRateLimit(ip, RATE_LIMIT_ACTION);

  // ── Build response with session cookie ───────────────────────────────────
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
      user: { id: userRow.id, email: userRow.email, role: 'admin' as const },
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
