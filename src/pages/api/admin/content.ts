/**
 * GET /api/admin/content?page=X
 *
 * Returns all page_content rows for the given page, nested as:
 *   { section: { key_name: value_text } }
 *
 * PUT /api/admin/content
 *
 * Body: { page, section, key, value }
 * Upserts a single content row (INSERT ... ON DUPLICATE KEY UPDATE).
 *
 * Auth: requireAdmin()
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth/middleware.js';
import { apiOk, apiError } from '../../../lib/api/response.js';
import { pool } from '../../../lib/db/pool.js';

export const GET: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const page = url.searchParams.get('page')?.trim();

  if (!page) {
    return apiError('page query parameter is required.', 'MISSING_PARAM', 400);
  }

  try {
    const [rows] = await pool.execute<
      Array<{ section: string; key_name: string; value_text: string | null }>
    >(
      'SELECT section, key_name, value_text FROM page_content WHERE page = ? ORDER BY section ASC, key_name ASC',
      [page]
    );

    // Nest by section → key_name
    const nested: Record<string, Record<string, string | null>> = {};
    for (const row of rows ?? []) {
      if (!nested[row.section]) nested[row.section] = {};
      nested[row.section][row.key_name] = row.value_text;
    }

    return apiOk({ page, content: nested });
  } catch (err) {
    console.error('[admin/content GET] Unexpected error:', err);
    return apiError('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError('Invalid JSON body.', 'INVALID_JSON', 400);
  }

  const page    = typeof body.page    === 'string' ? body.page.trim()    : '';
  const section = typeof body.section === 'string' ? body.section.trim() : '';
  const key     = typeof body.key     === 'string' ? body.key.trim()     : '';
  const value   = typeof body.value   === 'string' ? body.value          : '';

  if (!page)    return apiError('page is required.',    'MISSING_FIELD', 400);
  if (!section) return apiError('section is required.', 'MISSING_FIELD', 400);
  if (!key)     return apiError('key is required.',     'MISSING_FIELD', 400);

  try {
    await pool.execute(
      `INSERT INTO page_content (page, section, key_name, value_text)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)`,
      [page, section, key, value]
    );

    return apiOk({ page, section, key, value });
  } catch (err) {
    console.error('[admin/content PUT] Unexpected error:', err);
    return apiError('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
  }
};
