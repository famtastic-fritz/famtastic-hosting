/**
 * Auth middleware helpers for Astro API routes.
 *
 * Placeholder implementation for Track 2 (GoDaddy API layer).
 * Full auth will be wired in Track 1 (Supabase Auth).
 *
 * These stubs allow Track 2 routes to compile and run without blocking
 * on Track 1. Replace the placeholder implementations when Track 1 ships.
 */

import type { APIContext } from 'astro';

export interface AuthSession {
  userId: string;
  email: string;
  role: 'customer' | 'admin';
}

/**
 * Verify that the request has a valid session.
 * PLACEHOLDER: Currently checks for a session cookie or Authorization header.
 * Replace with real Supabase session verification in Track 1.
 */
export async function requireAuth(
  context: APIContext
): Promise<AuthSession | null> {
  // Check for Authorization header (for programmatic API access)
  const authHeader = context.request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // TODO (Track 1): Verify JWT with Supabase
    // For now, return null to block unauthenticated requests
    void token;
    return null;
  }

  // Check for session cookie
  const cookies = context.request.headers.get('Cookie') ?? '';
  const sessionMatch = cookies.match(/fam_session=([^;]+)/);
  if (sessionMatch) {
    // TODO (Track 1): Verify session cookie with Supabase
    void sessionMatch;
    return null;
  }

  return null;
}

/**
 * Verify that the request has a valid admin session.
 * PLACEHOLDER: Returns null (unauthorized) until Track 1 is wired.
 *
 * In development/testing, set BYPASS_ADMIN_AUTH=true in .env to allow
 * unauthenticated admin API access locally.
 */
export async function requireAdminAuth(
  context: APIContext
): Promise<AuthSession | null> {
  // Development bypass (local testing only — never enable in production)
  if (import.meta.env.BYPASS_ADMIN_AUTH === 'true' && import.meta.env.MODE !== 'production') {
    return {
      userId: 'dev-admin',
      email: 'fritz@famtastichosting.com',
      role: 'admin',
    };
  }

  const session = await requireAuth(context);
  if (!session) return null;
  if (session.role !== 'admin') return null;
  return session;
}

/**
 * Build a standard JSON error response for auth failures.
 */
export function unauthorizedResponse(message = 'Unauthorized'): Response {
  return new Response(
    JSON.stringify({ error: message, code: 'UNAUTHORIZED' }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Build a standard JSON error response for permission failures.
 */
export function forbiddenResponse(message = 'Forbidden'): Response {
  return new Response(
    JSON.stringify({ error: message, code: 'FORBIDDEN' }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
