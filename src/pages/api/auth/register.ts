/**
 * POST /api/auth/register
 *
 * Register a new customer account.
 * Request body: { email, password, confirmPassword }
 * Response: { success: true, sessionToken } or { success: false, error }
 *
 * On success:
 *   1. Validates input
 *   2. Hashes password with bcrypt
 *   3. INSERTs user row into the database
 *   4. Creates a GoDaddy shopper sub-account (non-blocking — registration
 *      succeeds even if the GoDaddy call fails)
 *   5. If shopperId returned, UPDATEs users.godaddy_shopper_id
 *   6. Issues a session cookie
 */

import type { APIRoute } from 'astro';
import { createShopper } from '../../../lib/godaddy/shoppers.js';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json() as {
      email?: string;
      password?: string;
      confirmPassword?: string;
    };

    // ── Input validation ────────────────────────────────────────────────────

    if (!body.email || !body.password || !body.confirmPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (body.password !== body.confirmPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Passwords do not match' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (body.password.length < 8) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── DB INSERT ───────────────────────────────────────────────────────────
    // TODO: Replace mock with real bcrypt + DB insert.
    // The block below is the intended integration point:
    //
    //   const hashedPassword = await bcrypt.hash(body.password, 12);
    //   const [row] = await db
    //     .insert(users)
    //     .values({ email: body.email, hashedPassword })
    //     .returning({ id: users.id });
    //   const userId = row.id;
    //
    // For now we use a deterministic mock userId so the GoDaddy wiring below
    // can be exercised end-to-end without a live database.
    const userId: string = crypto.randomUUID();

    // ── GoDaddy shopper creation (non-blocking) ─────────────────────────────
    // Fire-and-forget: registration succeeds regardless of outcome.
    const shopperId = await createShopper(body.email);

    if (shopperId) {
      // TODO: Replace with real DB UPDATE once DB is wired.
      // Example using Drizzle:
      //   await db
      //     .update(users)
      //     .set({ godaddyShopperId: shopperId })
      //     .where(eq(users.id, userId));
      console.info('[register] GoDaddy shopper linked', { userId, shopperId });
    } else {
      console.warn('[register] GoDaddy shopper creation failed — continuing without shopperId', {
        userId,
        email: body.email,
      });
    }

    // ── Session ─────────────────────────────────────────────────────────────
    const mockSessionToken = Buffer.from(`${body.email}:${Date.now()}`).toString('base64');

    cookies.set('fam_session', mockSessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60,
    });

    return new Response(
      JSON.stringify({ success: true, sessionToken: mockSessionToken }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Register error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
