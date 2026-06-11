export const prerender = false;

/**
 * GoDaddy Order Postback Webhook Handler
 *
 * Receives provisioning status notifications from GoDaddy after a customer
 * completes a purchase. GoDaddy POSTs order data to this endpoint when
 * provisioning events occur.
 *
 * Route: POST /api/orders/postback
 *
 * Security: Validates the presence of the X-GoDaddy-Signature or a shared
 * secret in the Authorization header. Update GODADDY_POSTBACK_SECRET in .env
 * once you receive the actual postback secret from GoDaddy reseller portal.
 *
 * GoDaddy postback docs: https://developer.godaddy.com/doc/endpoint/orders
 */

import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db/pool.js';
import { timingSafeEqual } from 'node:crypto';

// ─── Expected GoDaddy postback payload shape ─────────────────────────────────

interface GoDaddyPostbackPayload {
  orderId?: string;
  customerId?: string;
  status?: string;          // e.g. "PROVISION_COMPLETE", "PROVISION_FAILED", "ACTIVE"
  productType?: string;
  productId?: string;
  quantity?: number;
  domain?: string;
  createdAt?: string;
  // GoDaddy postback fields vary by product type — treat as open object
  [key: string]: unknown;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validates the postback request origin using constant-time comparison.
 *
 * Fails CLOSED: when GODADDY_POSTBACK_SECRET is not configured the endpoint
 * returns 401 immediately. The only exception is explicit development mode
 * (MODE=development AND GODADDY_POSTBACK_ALLOW_INSECURE=1).
 */
function validatePostback(request: Request): boolean {
  const expectedSecret = import.meta.env.GODADDY_POSTBACK_SECRET;

  if (!expectedSecret) {
    const isDev = import.meta.env.MODE === 'development';
    const allowInsecure = import.meta.env.GODADDY_POSTBACK_ALLOW_INSECURE === '1';
    if (isDev && allowInsecure) {
      console.warn(
        '[postback] GODADDY_POSTBACK_SECRET unset — insecure dev bypass active'
      );
      return true;
    }
    console.error(
      '[postback] GODADDY_POSTBACK_SECRET is not set — rejecting request'
    );
    return false;
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  try {
    const tokenBuf = Buffer.from(token);
    const secretBuf = Buffer.from(expectedSecret);

    if (tokenBuf.length !== secretBuf.length) {
      const dummy = Buffer.alloc(secretBuf.length);
      timingSafeEqual(dummy, secretBuf);
      return false;
    }

    return timingSafeEqual(tokenBuf, secretBuf);
  } catch {
    return false;
  }
}

/**
 * Maps a GoDaddy provisioning status to our internal order status string.
 */
function mapProvisioningStatus(godaddyStatus?: string): string {
  if (!godaddyStatus) return 'unknown';
  const s = godaddyStatus.toUpperCase();
  if (s.includes('COMPLETE') || s === 'ACTIVE') return 'active';
  if (s.includes('FAILED') || s.includes('ERROR')) return 'failed';
  if (s.includes('PENDING') || s.includes('PROVISION')) return 'provisioning';
  if (s.includes('CANCEL') || s.includes('SUSPEND')) return 'cancelled';
  return s.toLowerCase();
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  const timestamp = new Date().toISOString();

  // ── Validate postback origin ──────────────────────────────────────────────
  if (!validatePostback(request)) {
    console.warn(`[postback] Unauthorized postback attempt at ${timestamp}`);
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── Parse payload ─────────────────────────────────────────────────────────
  let payload: GoDaddyPostbackPayload;
  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      payload = await request.json() as GoDaddyPostbackPayload;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      payload = Object.fromEntries(formData.entries()) as GoDaddyPostbackPayload;
    } else {
      const rawText = await request.text();
      payload = rawText ? (JSON.parse(rawText) as GoDaddyPostbackPayload) : {};
    }
  } catch (parseError) {
    console.error('[postback] Failed to parse payload:', parseError);
    return new Response(
      JSON.stringify({ ok: true, warning: 'payload_parse_error' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[postback] Received at ${timestamp}:`, {
    orderId: payload.orderId,
    status: payload.status,
    productType: payload.productType,
    domain: payload.domain,
  });

  // ── Persist to MySQL ────────────────────────────────────────────────────
  if (payload.orderId) {
    try {
      const internalStatus = mapProvisioningStatus(payload.status);

      // Safety check: only update orders we already know about.
      const [existing] = await pool.execute<
        Array<{ id: string }>
      >(
        'SELECT id FROM orders WHERE godaddy_order_id = ?',
        [payload.orderId]
      );

      if (existing.length === 0) {
        console.warn(
          `[postback] Order ${payload.orderId} not found in orders table — rejecting`
        );
        return new Response(
          JSON.stringify({ ok: true, note: 'order_not_recognized' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Update the existing, verified order row
      const provisionedAt = internalStatus === 'active' ? timestamp.slice(0, 19).replace('T', ' ') : null;
      const updatedAt = timestamp.slice(0, 19).replace('T', ' ');

      await pool.execute(
        'UPDATE orders SET status = ?, provisioning_status = ?, provisioned_at = COALESCE(?, provisioned_at), updated_at = ?, raw_postback = ? WHERE godaddy_order_id = ?',
        [internalStatus, payload.status ?? null, provisionedAt, updatedAt, JSON.stringify(payload), payload.orderId]
      );

      console.log(
        `[postback] Order ${payload.orderId} updated to: ${internalStatus}`
      );
    } catch (dbError) {
      console.error('[postback] Database error:', dbError);
      // Fall through — return 200 regardless to prevent GoDaddy retry storms
    }
  } else {
    console.warn('[postback] Received postback with no orderId:', payload);
  }

  // ── Always return 200 to acknowledge receipt ──────────────────────────────
  return new Response(
    JSON.stringify({ ok: true, received_at: timestamp }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

// ─── GET: Health probe for postback endpoint ─────────────────────────────────
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      endpoint: '/api/orders/postback',
      method: 'POST',
      status: 'ready',
      note: 'GoDaddy order postback webhook. Accepts provisioning status notifications.',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};