export const prerender = false;

import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/auth/middleware.js';
import { buildSiteLaunchPlan, FulfillmentContractError } from '../../../../lib/fulfillment/site-launch.mjs';

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;
  try {
    const input = await request.json();
    const plan = buildSiteLaunchPlan(input);
    return json({ ok: true, plan }, 200);
  } catch (error) {
    if (error instanceof FulfillmentContractError) return json({ ok: false, error: error.code, message: error.message }, 422);
    return json({ ok: false, error: 'launch_plan_invalid', message: 'The launch plan could not be created.' }, 400);
  }
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' } });
}
