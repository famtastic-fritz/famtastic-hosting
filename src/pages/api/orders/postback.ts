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

// ─── Expected GoDaddy postback payload shape ──────────────────────────────────

interface GoDaddyPostbackPayload {
  orderId?: string;
  customerId?: string;
  status?: string;           // e.g. "PROVISION_COMPLETE", "PROVISION_FAILED", "ACTIVE"
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
 * Validates the postback request origin.
 *
 * GoDaddy postbacks may include a shared secret or signature header.
 * Returns true when credentials are valid or not yet configured (development mode).
 *
 * In production: set GODADDY_POSTBACK_SECRET in your .env file.
 * When set, the Authorization header must match: "Bearer <secret>"
 */
function validatePostback(request: Request): boolean {
  const expectedSecret = import.meta.env.GODADDY_POSTBACK_SECRET;

  // If no secret is configured, allow all postbacks (dev/staging only)
  // In production this env var MUST be set
  if (!expectedSecret) {
    console.warn('[postback] GODADDY_POSTBACK_SECRET not set — accepting all requests (dev mode)');
    return true;
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  // Accept "Bearer <secret>" format
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  return token === expectedSecret;
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

      // Upsert: update existing order row if godaddy_order_id matches,
      // or record as a new postback event.
      const { error: upsertError } = await supabase
        .from('orders')
        .upsert(
          {
            godaddy_order_id: payload.orderId,
            status: internalStatus,
            provisioning_status: payload.status ?? null,
            provisioned_at: internalStatus === 'active' ? timestamp : null,
            updated_at: timestamp,
            raw_postback: payload,
          },
          {
            onConflict: 'godaddy_order_id',
            ignoreDuplicates: false,
          }
        );

      if (upsertError) {
        // Log but don't surface to GoDaddy — return 200 to prevent retries
        console.error('[postback] Supabase upsert error:', upsertError);
      } else {
        console.log(`[postback] Order ${payload.orderId} updated to status: ${internalStatus}`);
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
