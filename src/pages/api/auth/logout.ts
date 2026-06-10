/**
 * POST /api/auth/logout
 * 
 * Logout by deleting the session.
 * Response: { success: true }
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/db/pool.js';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Get session token from cookie
    const cookieHeader = request.headers.get('Cookie') ?? '';
    const match = cookieHeader.match(/(?:^|;\s*)fam_session=([^;]+)/);
    const sessionToken = match ? decodeURIComponent(match[1]).trim() : null;

    if (sessionToken) {
      // Delete from DB
      await query(
        'DELETE FROM sessions WHERE session_id = ?',
        [sessionToken]
      );
    }

    // Clear cookie
    cookies.delete('fam_session', { path: '/' });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[logout] error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Logout failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
