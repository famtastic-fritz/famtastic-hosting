/**
 * POST /api/auth/logout
 *
 * Deletes the session from MySQL and clears the session cookie.
 * Redirects to / after clearing the session.
 *
 * No request body required. Safe to call even if not authenticated.
 */

import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db/pool.js';
import { SESSION_COOKIE } from '../../../lib/auth/middleware.js';
import { buildClearCookieHeader } from '../../../lib/auth/helpers.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Try to get the session token from the cookie so we can delete it from DB
  const cookieHeader = request.headers.get('Cookie') ?? '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));

  if (match) {
    try {
      const token = decodeURIComponent(match[1]).trim();
      if (token) {
        // Delete the session from MySQL
        await pool.execute('DELETE FROM sessions WHERE token = ?', [token]);
      }
    } catch {
      // Session cookie was malformed — just clear it, don't error
    }
  }

  // Clear cookie and redirect to homepage
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/',
      'Set-Cookie': buildClearCookieHeader(),
    },
  });
};

// ─── GET for convenience (e.g. <a href="/api/auth/logout"> links) ─────────────
export const GET: APIRoute = async ({ request }) => {
  return POST({ request } as Parameters<APIRoute>[0]);
};