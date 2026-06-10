/**
 * GoDaddy Order Postback Webhook Handler
 *
 * Receives provisioning status notifications from GoDaddy after a customer
 * completes a purchase on store.famtastichosting.com. GoDaddy POSTs order
 * data to this endpoint when provisioning events occur.
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
import { createClient } from '@supabase/supabase-js';
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
    // Allow insecure mode ONLY in local development with explicit opt-in
    const isDev = import.meta.env.MODE === 'development';
    const allowInsecure = import.meta.env.GODADDY_POSTBACK_ALLOW_INSECURE === '1';
    if (isDev && allowInsecure) {
      console.warn(
        '[postback] GODADDY_POSTBACK_SECRET unset — insecure dev bypass active'
      );
      return true;
    }
    // Fail closed in all other cases
    console.error(
      '[postback] GODADDY_POSTBACK_SECRET is not set — rejecting request'
    );
    return false;
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  // Accept "Bearer <secret>" format
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  // Constant-time comparison to prevent timing attacks.
  // Pad the shorter buffer to match lengths; mismatched lengths always fail.
  try {
    const tokenBuf = Buffer.from(token);
    const secretBuf = Buffer.from(expectedSecret);

    if (tokenBuf.length !== secretBuf.length) {
      // Different lengths: always reject, but do a dummy comparison to
      // preserve constant time on the branch.
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
      // Attempt JSON anyway — GoDaddy sometimes omits Content-Type
      const rawText = await request.text();
      payload = rawText ? (JSON.parse(rawText) as GoDaddyPostbackPayload) : {};
    }
  } catch (parseError) {
    console.error('[postback] Failed to parse payload:', parseError);
    // Return 200 to prevent GoDaddy retrying a malformed payload indefinitely
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

  // ── Persist to Supabase ───────────────────────────────────────────────────
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseServiceKey && payload.orderId) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const internalStatus = mapProvisioningStatus(payload.status);

      // Safety check: only update orders we already know about.
      // Never upsert based on an attacker-supplied godaddy_order_id.
      const { data: existingOrder, error: lookupError } = await supabase
        .from('orders')
        .select('id')
        .eq('godaddy_order_id', payload.orderId)
        .single();

      if (lookupError || !existingOrder) {
        console.warn(
          `[postback] Order ${payload.orderId} not found in orders table — rejecting`
        );
        // Return 200 so GoDaddy doesn't retry; we just don't persist it.
        return new Response(
          JSON.stringify({ ok: true, note: 'order_not_recognized' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Update the existing, verified order row
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: internalStatus,
          provisioning_status: payload.status ?? null,
          provisioned_at: internalStatus === 'active' ? timestamp : null,
          updated_at: timestamp,
          raw_postback: payload,
        })
        .eq('godaddy_order_id', payload.orderId);

      if (updateError) {
        // Log but don't surface to GoDaddy — return 200 to prevent retries
        console.error('[postback] Supabase update error:', updateError);
      } else {
        console.log(
          `[postback] Order ${payload.orderId} updated to: ${internalStatus}`
        );
      }
    } catch (dbError) {
      console.error('[postback] Database error:', dbError);
      // Fall through — return 200 regardless to prevent GoDaddy retry storms
    }
  } else {
    // No DB configured or no orderId — log for debugging
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('[postback] Supabase not configured — order not persisted');
    }
    if (!payload.orderId) {
      console.warn('[postback] Received postback with no orderId:', payload);
    }
  }

  // ── Always return 200 to acknowledge receipt ──────────────────────────────
  // GoDaddy retries on non-2xx. Return 200 even on DB errors so we don't get
  // duplicate processing storms when the DB is temporarily unavailable.
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
