/**
 * Session management utilities for MySQL-backed sessions.
 *
 * Creates and deletes sessions in the `sessions` table.
 * The session token is an opaque UUID stored in the fam_session httpOnly cookie.
 *
 * Replaces Supabase Auth session management with a local implementation.
 */

import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';

/** Session lifetime: 30 days */
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Create a new session for the given user.
 *
 * @returns The opaque session token to store in the cookie.
 */
export async function createSession(
  userId: number | string,
  ip?: string | null,
  userAgent?: string | null,
): Promise<string> {
  const id = randomUUID();
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

  await pool.execute(
    'INSERT INTO sessions (id, user_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    [
      id,
      userId,
      token,
      ip ?? null,
      userAgent ?? null,
      expiresAt.toISOString().slice(0, 19).replace('T', ' '),
    ],
  );

  return token;
}

/**
 * Delete a session by token (e.g. on logout).
 */
export async function deleteSession(token: string): Promise<void> {
  await pool.execute('DELETE FROM sessions WHERE token = ?', [token]);
}