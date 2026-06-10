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
import { supabaseAdmin } from '../../../lib/supabase/client.js';

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
    const upsertRows = updates.map(([key, value]) => ({ key, value: String(value) }));

    const { error } = await supabaseAdmin
      .from('admin_settings')
      .upsert(upsertRows, { onConflict: 'key' });

    if (error) {
      console.error('[admin/settings] Supabase error:', error.message);
      return apiError('Failed to save settings.', 'DB_ERROR', 500);
    }

    return apiOk({
      saved: updates.map(([key]) => key),
    });
  } catch (err) {
    console.error('[admin/settings] Unexpected error:', err);
    return apiError('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
  }
};
