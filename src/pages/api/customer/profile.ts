/**
 * GET  /api/customer/profile  — returns authenticated customer's profile
 * PATCH /api/customer/profile — updates allowed fields
 *
 * Profile data lives in the users table in MySQL.
 * Email/password changes are not surfaced here.
 *
 * GET response:
 *   { id, email, role, godaddy_shopper_id, created_at, updated_at }
 *
 * PATCH body (JSON):
 *   No customer-settable fields are currently exposed.
 *   godaddy_shopper_id is intentionally excluded — it is set by admin only
 *   via /api/admin/customers/:id to prevent account-hijacking.
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth/middleware.js';
import { pool } from '../../../lib/db/pool.js';
import { apiOk, apiError } from '../../../lib/api/response.js';

export const prerender = false;

// ─── GET ──────────────────────────────────────────────────────────────────────

export const GET: APIRoute = async (context) => {
  const authResult = await requireAuth(context.request);
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  const [rows] = await pool.execute<
    Array<{ id: number; email: string; role: string; godaddy_shopper_id: string | null; created_at: string; updated_at: string }>
  >(
    'SELECT id, email, role, godaddy_shopper_id, created_at, updated_at FROM users WHERE id = ?',
    [user.id]
  );

  if (rows.length === 0) {
    return apiError('Profile not found.', 'NOT_FOUND', 404);
  }

  return apiOk(rows[0]);
};

// ─── PATCH ────────────────────────────────────────────────────────────────────

export const PATCH: APIRoute = async (context) => {
  const authResult = await requireAuth(context.request);
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  let body: Record<string, unknown>;
  try {
    body = (await context.request.json()) as Record<string, unknown>;
  } catch {
    return apiError('Invalid JSON body.', 'BAD_REQUEST', 400);
  }

  // godaddy_shopper_id is set by admin only via /api/admin/customers/:id.
  // Customers cannot self-assign a shopper ID — they could claim another
  // customer's GoDaddy account.
  // Email changes require the auth flow.
  // Role changes are admin-only and enforced at the DB column level.
  const allowedFields: string[] = [];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) {
      const value = body[field];
      if (typeof value !== 'string' && value !== null) {
        return apiError(`Field "${field}" must be a string or null.`, 'BAD_REQUEST', 400);
      }
      updates[field] = value;
    }
  }

  if (Object.keys(updates).length === 0) {
    return apiError('No updatable fields provided.', 'BAD_REQUEST', 400);
  }

  updates['updated_at'] = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), user.id];

  const [result] = await pool.execute(
    `UPDATE users SET ${setClauses} WHERE id = ?`,
    values
  );

  const updateResult = result as { affectedRows: number };
  if (updateResult.affectedRows === 0) {
    return apiError('Failed to update profile.', 'UPDATE_FAILED', 500);
  }

  // Fetch the updated row
  const [updatedRows] = await pool.execute<
    Array<{ id: number; email: string; role: string; godaddy_shopper_id: string | null; created_at: string; updated_at: string }>
  >(
    'SELECT id, email, role, godaddy_shopper_id, created_at, updated_at FROM users WHERE id = ?',
    [user.id]
  );

  return apiOk(updatedRows[0]);
};