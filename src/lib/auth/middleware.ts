/**
 * Auth middleware for Astro API routes and server-rendered pages.
 *
 * Three exported functions:
 *   requireAuth(request)   — extracts Supabase session from cookie, returns
 *                            user or redirects to /dashboard/login
 *   requireAdmin(request)  — same as requireAuth but also checks role=admin,
 *                            redirects to /admin/login if not admin
 *   getSession(request)    — returns session without redirecting (optional auth)
 *
 * Session flow:
 *   1. Client sends the `fam_session` httpOnly cookie with every request.
 *   2. We extract the raw JSON token, call supabase.auth.setSession() to
 *      validate and refresh it if needed, then look up the user's role in
 *      public.users.
 *   3. On success we return an AuthUser. On failure we redirect or return null.
 */

import { supabaseAdmin } from '../supabase/client.js';
import type { UserRow } from '../supabase/types.js';

// ─── Session cookie name ──────────────────────────────────────────────────────

export const SESSION_COOKIE = 'fam_session';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: UserRow['role'];
}

// ─── Internal: extract & validate session from cookie ────────────────────────

async function extractSession(request: Request): Promise<AuthUser | null> {
  const cookieHeader = request.headers.get('Cookie') ?? '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;

  let sessionData: { access_token?: string; refresh_token?: string };
  try {
    sessionData = JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }

  if (!sessionData.access_token || !sessionData.refresh_token) return null;

  // Validate the session tokens with Supabase
  const { data, error } = await supabaseAdmin.auth.setSession({
    access_token: sessionData.access_token,
    refresh_token: sessionData.refresh_token,
  });

  if (error || !data.user) return null;

  // Look up role from our public.users table (Supabase auth doesn't store role)
  const { data: userRow, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email, role')
    .eq('id', data.user.id)
    .single();

  if (userError || !userRow) return null;

  return {
    id: userRow.id,
    email: userRow.email,
    role: userRow.role,
  };
}

// ─── requireAuth ─────────────────────────────────────────────────────────────

/**
 * Extracts the Supabase session from the request cookie and validates it.
 * Returns an AuthUser if authenticated, or a redirect Response to /dashboard/login.
 *
 * Usage in an Astro API route:
 *   const authResult = await requireAuth(Astro.request);
 *   if (authResult instanceof Response) return authResult;
 *   // authResult is AuthUser
 */
export async function requireAuth(request: Request): Promise<AuthUser | Response> {
  const user = await extractSession(request);
  if (!user) {
    return Response.redirect(new URL('/dashboard/login', request.url), 302);
  }
  return user;
}

// ─── requireAdmin ─────────────────────────────────────────────────────────────

/**
 * Same as requireAuth but additionally enforces role === 'admin'.
 * Redirects to /admin/login if the user is not authenticated or not an admin.
 *
 * Usage:
 *   const authResult = await requireAdmin(Astro.request);
 *   if (authResult instanceof Response) return authResult;
 *   // authResult is AuthUser with role 'admin'
 */
export async function requireAdmin(request: Request): Promise<AuthUser | Response> {
  const user = await extractSession(request);
  if (!user) {
    return Response.redirect(new URL('/admin/login', request.url), 302);
  }
  if (user.role !== 'admin') {
    return Response.redirect(new URL('/admin/login', request.url), 302);
  }
  return user;
}

// ─── getSession ───────────────────────────────────────────────────────────────

/**
 * Returns the AuthUser if a valid session exists, or null if not authenticated.
 * Does NOT redirect — use this for optional auth (e.g. homepage personalization).
 *
 * Usage:
 *   const user = await getSession(Astro.request);
 *   if (user) { /* show logged-in UI *\/ }
 */
export async function getSession(request: Request): Promise<AuthUser | null> {
  return extractSession(request);
}

// ─── Re-export backward-compatible names used by Track 2 GoDaddy routes ───────

export { AuthUser as AuthSession };

/**
 * Backward-compatible wrapper used by existing GoDaddy API route stubs.
 * Returns AuthUser or null (no redirect).
 */
export async function requireAuthOrNull(request: Request): Promise<AuthUser | null> {
  return extractSession(request);
}
