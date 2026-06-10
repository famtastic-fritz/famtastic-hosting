/**
 * POST /api/admin/settings
 *
 * Upsert admin settings into the admin_settings table.
 * Called from /admin/settings when Fritz saves notification preferences.
 *
 * Body: Record<string, string> — key/value pairs to upsert.
 *
 * Only allows updating whitelisted keys to prevent abuse.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth/middleware.js';
import { apiOk, apiError } from '../../../lib/api/response.js';
import { pool } from '../../../lib/db/pool.js';

const ALLOWED_KEYS = new Set([
  'notify_email',
  'notify_on_order',
  'notify_on_provisioning',
  'support_phone',
]);

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  let body: Record<string, string>;
  try {
    body = (await request.json()) as Record<string, string>;
  } catch {
    return apiError('Invalid JSON body.', 'INVALID_JSON', 400);
  }

  // Filter to allowed keys only
  const updates = Object.entries(body).filter(([k]) => ALLOWED_KEYS.has(k));

  if (updates.length === 0) {
    return apiError('No valid settings keys provided.', 'NO_VALID_KEYS', 400);
  }

  try {
    // Use INSERT ... ON DUPLICATE KEY UPDATE for each key (upsert)
    for (const [key, value] of updates) {
      await pool.execute(
        'INSERT INTO admin_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
        [key, String(value)]
      );
    }

    return apiOk({
      saved: updates.map(([key]) => key),
    });
  } catch (err) {
    console.error('[admin/settings] Unexpected error:', err);
    return apiError('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
  }
};