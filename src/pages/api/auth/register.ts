/**
 * POST /api/auth/register
 * 
 * Register a new customer account.
 * Request body: { email, password, confirmPassword }
 * Response: { success: true, sessionToken } or { success: false, error }
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/db/pool.js';
import { hashPassword, generateSessionToken } from '../../../lib/auth/password.js';

const SESSION_TTL_SECONDS = 24 * 60 * 60;

interface RegisterRequest {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface RowWithId {
  id?: number;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = (await request.json()) as RegisterRequest;

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

    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if email already exists
    const [existing] = await query<RowWithId[]>(
      'SELECT id FROM users WHERE email = ?',
      [body.email]
    );

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email already registered' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(body.password);

    // Insert user
    const [insertResult] = await query(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      [body.email, passwordHash, 'customer']
    );

    // Get user ID from insert result
    const userId = (insertResult as any).insertId;

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;

    await query(
      'INSERT INTO sessions (session_id, expires, data) VALUES (?, ?, ?)',
      [sessionToken, expiresAt, JSON.stringify({ user_id: userId, email: body.email })]
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
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[register] error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Registration failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
