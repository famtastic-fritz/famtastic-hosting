/**
 * GoDaddy Shopper Management
 * SERVER-SIDE ONLY.
 *
 * Manages shopper sub-accounts under the reseller umbrella.
 * Each customer registration creates a shopper account on GoDaddy so that
 * orders and domains are tied to that shopper rather than the reseller root.
 *
 * Endpoint: POST /v1/shoppers
 * Docs: https://developer.godaddy.com/doc/endpoint/shoppers
 */

import { godaddyFetch } from './client.js';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CreateShopperResponse {
  shopperId: string;
}

// ─── Create Shopper ────────────────────────────────────────────────────────────

/**
 * Create a GoDaddy shopper sub-account for a newly registered customer.
 *
 * @param email     The customer's email address (used as the shopper login).
 * @param marketId  Locale/market identifier (e.g. "en-US"). Defaults to "en-US".
 * @returns         The shopperId string on success, or null on any failure.
 *
 * This function NEVER throws. Any error is logged to stderr and null is returned
 * so the caller can degrade gracefully without interrupting the registration flow.
 */
export async function createShopper(
  email: string,
  marketId = 'en-US'
): Promise<string | null> {
  try {
    const response = await godaddyFetch<CreateShopperResponse>('/shoppers', {
      method: 'POST',
      body: {
        email,
        marketId,
        nameFirst: '',
        nameLast: '',
      },
    });

    const shopperId = response?.shopperId;

    if (!shopperId) {
      console.error('[shoppers] createShopper: response missing shopperId', {
        email,
        response,
      });
      return null;
    }

    return shopperId;
  } catch (err) {
    console.error('[shoppers] createShopper failed:', {
      email,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
