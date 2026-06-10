/**
 * POST /api/auth/login
 * 
 * Login with email and password.
 * Request body: { email, password }
 * Response: { success: true, sessionToken } or { success: false, error }
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/db/pool.js';
import { verifyPassword, generateSessionToken } from '../../../lib/auth/password.js';

const SESSION_TTL_SECONDS = 24 * 60 * 60;

interface LoginRequest {
  email?: string;
  password?: string;
}

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  role: 'customer' | 'admin';
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = (await request.json()) as LoginRequest;

    // Validate input
    if (!body.email || !body.password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing email or password' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Query user
    const [rows] = await query<UserRow[]>(
      'SELECT id, email, password_hash, role FROM users WHERE email = ? LIMIT 1',
      [body.email]
    );

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = rows[0];

    // Verify password
    const passwordValid = await verifyPassword(body.password, user.password_hash);
    if (!passwordValid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;

    await query(
      'INSERT INTO sessions (session_id, expires, data) VALUES (?, ?, ?)',
      [sessionToken, expiresAt, JSON.stringify({ user_id: user.id, email: user.email, role: user.role })]
    );

    // Set secure session cookie
    cookies.set('fam_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    });

    return new Response(
      JSON.stringify({ success: true, sessionToken }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[login] error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Login failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
