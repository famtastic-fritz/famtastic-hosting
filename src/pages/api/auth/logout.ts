/**
 * POST /api/auth/logout
 * 
 * Logout by deleting the session.
 * Response: { success: true }
 */

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete('fam_session');
  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
