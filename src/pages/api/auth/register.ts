/**
 * POST /api/auth/register
 * 
 * Register a new customer account.
 * Request body: { email, password, confirmPassword }
 * Response: { success: true, sessionToken } or { success: false, error }
 */

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json() as {
      email?: string;
      password?: string;
      confirmPassword?: string;
    };

    // Validate input
    if (!body.email || !body.password || !body.confirmPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (body.password !== body.confirmPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Passwords do not match' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (body.password.length < 8) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Wire bcrypt + DB insertion
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
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Register error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
