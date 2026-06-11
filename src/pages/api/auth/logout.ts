export const prerender = false;

import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../lib/auth/middleware.js';
import { invalidateSession } from '../../../lib/auth/session.js';
import { buildClearCookieHeader } from '../../../lib/auth/helpers.js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('Cookie') ?? '';
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
    if (match) {
      const token = decodeURIComponent(match[1]).trim();
      await invalidateSession(token).catch(() => {});
    }
  } catch (err) {
    console.error('[logout] error:', err);
  }

  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': buildClearCookieHeader(),
      },
    }
  );
};
