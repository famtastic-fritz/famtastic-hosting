/**
 * POST /api/auth/logout
 *
 * Signs the current user out from Supabase and clears the session cookie.
 * Redirects to / after clearing the session.
 *
 * No request body required. Safe to call even if not authenticated.
 */

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase/client.js';
import { SESSION_COOKIE } from '../../../lib/auth/middleware.js';
import { buildClearCookieHeader } from '../../../lib/auth/helpers.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Try to get the current session tokens so we can explicitly sign out
  const cookieHeader = request.headers.get('Cookie') ?? '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));

  if (match) {
    try {
      const sessionData = JSON.parse(decodeURIComponent(match[1])) as {
        access_token?: string;
        refresh_token?: string;
      };

      if (sessionData.access_token && sessionData.refresh_token) {
        // Set the session then sign out to invalidate the refresh token server-side
        await supabaseAdmin.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        });
        await supabaseAdmin.auth.signOut();
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
  // Delegate to POST logic
  return POST({ request } as Parameters<APIRoute>[0]);
};
