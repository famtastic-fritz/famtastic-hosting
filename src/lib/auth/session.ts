/**
 * Session management — create and invalidate sessions
 *
 * Exported functions:
 *   createSession(userId, role) → { sessionId, token, expiresAt }
 *   invalidateSession(token)    → deletes from DB
 */

import { pool } from '../db/pool.js';
import { generateSessionToken } from './password.js';

const SESSION_TTL_HOURS = 24;

interface SessionData {
  sessionId: string;
  token: string;
  expiresAt: Date;
}

/**
 * Create a new session record in the DB.
 * Returns the session token (to be set as a cookie).
 */
export async function createSession(userId: number): Promise<SessionData> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  try {
    const [result] = await pool.execute(
      `INSERT INTO sessions (session_id, expires, data)
       VALUES (?, ?, ?)`,
      [
        token, // session_id
        Math.floor(expiresAt.getTime() / 1000), // expires (unix timestamp)
        JSON.stringify({ user_id: userId }), // data
      ]
    );

    return {
      sessionId: token,
      token,
      expiresAt,
    };
  } catch (err) {
    console.error('[session] create failed:', err);
    throw new Error('Failed to create session');
  }
}

/**
 * Delete a session from the DB.
 */
export async function invalidateSession(token: string): Promise<void> {
  try {
    await pool.execute(
      `DELETE FROM sessions WHERE session_id = ?`,
      [token]
    );
  } catch (err) {
    console.error('[session] invalidate failed:', err);
    throw new Error('Failed to invalidate session');
  }
}
