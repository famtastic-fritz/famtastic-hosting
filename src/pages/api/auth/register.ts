export const prerender = false;

import type { APIRoute } from 'astro';
import { query } from '../../../lib/db/pool.js';
import { hashPassword } from '../../../lib/auth/password.js';
import { createSession } from '../../../lib/auth/session.js';
import { buildSetCookieHeader, hashRateLimit, clearRateLimit, getClientIP } from '../../../lib/auth/helpers.js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as {
      email?: string;
      password?: string;
      confirmPassword?: string;
    };

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

    const ip = getClientIP(request);
    if (hashRateLimit(ip, 'register')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Too many attempts. Try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const email = body.email.toLowerCase().trim();

    // Check email not already registered
    const [existing] = await query<any[]>('SELECT id FROM users WHERE email = ?', [email]);
    if ((existing as any[]).length > 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email already registered' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const passwordHash = await hashPassword(body.password);

    const [result] = await query<any>(
      'INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, NOW())',
      [email, passwordHash, 'customer']
    );
    const userId = (result as any).insertId;

    const session = await createSession(userId);
    clearRateLimit(ip, 'register');

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': buildSetCookieHeader(session.token, import.meta.env.PROD as boolean),
        },
      }
    );
  } catch (err) {
    console.error('[register] error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
