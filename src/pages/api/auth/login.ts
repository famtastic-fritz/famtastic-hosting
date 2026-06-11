export const prerender = false;

import type { APIRoute } from 'astro';
import { query } from '../../../lib/db/pool.js';
import { verifyPassword } from '../../../lib/auth/password.js';
import { createSession } from '../../../lib/auth/session.js';
import { buildSetCookieHeader, hashRateLimit, clearRateLimit, getClientIP } from '../../../lib/auth/helpers.js';

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  role: 'customer' | 'admin';
}

export const POST: APIRoute = async ({ request }) => {
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

    const ip = getClientIP(request);
    if (hashRateLimit(ip, 'login')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Too many attempts. Try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const email = body.email.toLowerCase().trim();

    const [rows] = await query<UserRow[]>(
      'SELECT id, email, password_hash, role FROM users WHERE email = ?',
      [email]
    );
    const users = rows as UserRow[];

    // Always run verifyPassword even if no user found — prevents timing attacks
    const dummyHash = '$2a$10$dummy.hash.to.prevent.timing.attack.padding.here000000';
    const valid = users.length > 0
      ? await verifyPassword(body.password, users[0].password_hash)
      : await verifyPassword(body.password, dummyHash).then(() => false);

    if (users.length === 0 || !valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email or password' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = users[0];
    const session = await createSession(user.id);
    clearRateLimit(ip, 'login');

    return new Response(
      JSON.stringify({ success: true, user: { email: user.email, role: user.role } }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': buildSetCookieHeader(session.token, import.meta.env.PROD as boolean),
        },
      }
    );
  } catch (err) {
    console.error('[login] error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
