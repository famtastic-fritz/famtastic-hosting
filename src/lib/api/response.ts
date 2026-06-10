/**
 * Shared API response helpers for Astro API routes.
 * Provides consistent JSON error/success shapes across all endpoints.
 */

import { GoDaddyError } from '../godaddy/types.js';

export interface APISuccess<T> {
  data: T;
  ok: true;
}

export interface APIError {
  error: string;
  code: string;
  ok: false;
  fields?: unknown[];
}

/** Build a successful JSON response. */
export function apiOk<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, data } satisfies APISuccess<T>), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Build an error JSON response. */
export function apiError(
  message: string,
  code = 'INTERNAL_ERROR',
  status = 500,
  fields?: unknown[]
): Response {
  const body: APIError = { ok: false, error: message, code };
  if (fields) body.fields = fields;
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Handle any error thrown by the GoDaddy client and return an appropriate
 * API response. Keeps GoDaddy error details server-side; only user-friendly
 * messages are sent to the client.
 */
export function handleGoDaddyError(err: unknown): Response {
  if (err instanceof GoDaddyError) {
    const status =
      err.statusCode === 401 || err.statusCode === 403
        ? 502  // Our server couldn't auth with GoDaddy — upstream error, not client error
        : err.statusCode === 404
        ? 404
        : err.statusCode === 429
        ? 429
        : 502;

    return apiError(err.message, err.code, status, err.fields);
  }

  if (err instanceof Error) {
    console.error('[GoDaddy API Error]', err.message);
    return apiError('An unexpected error occurred. Please try again.', 'INTERNAL_ERROR', 500);
  }

  console.error('[GoDaddy API Unknown Error]', err);
  return apiError('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
}
