/**
 * POST /api/auth/login
 * 
 * Login with email and password.
 * Request body: { email, password }
 * Response: { success: true, sessionToken } or { success: false, error }
 */

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json() as {
      email?: string;
      password?: string;
    };

    if (!body.email || !body.password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and password required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Wire bcrypt + DB validation
    // For now: return success with mock session token
    const mockSessionToken = Buffer.from(`${body.email}:${Date.now()}`).toString('base64');
    
    cookies.set('fam_session', mockSessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60,
    });

    return new Response(
      JSON.stringify({ success: true, sessionToken: mockSessionToken }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Login error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
