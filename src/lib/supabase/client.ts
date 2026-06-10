/**
 * Supabase client — FAMtastic Hosting
 *
 * Two exports:
 *   supabase        — browser client (anon key, RLS enforced, safe to import from client code)
 *   supabaseAdmin   — service-role client (bypasses RLS, SERVER-SIDE ONLY)
 *
 * Never import supabaseAdmin from any client-side component or page script.
 * The service-role key must only exist in server-side Astro API routes and
 * server-side load functions.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types.js';

// ─── Environment ──────────────────────────────────────────────────────────────

function getEnv(key: string): string {
  // import.meta.env works in both Astro client and server contexts
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

// ─── Browser Client (safe for client-side code) ───────────────────────────────

/**
 * Anon-key Supabase client. Safe to use anywhere — RLS policies enforce data
 * access rules per user. Reads SUPABASE_URL + SUPABASE_ANON_KEY from env.
 */
export const supabase = createClient<Database>(
  getEnv('PUBLIC_SUPABASE_URL'),
  getEnv('PUBLIC_SUPABASE_ANON_KEY'),
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      autoRefreshToken: true,
    },
  }
);

// ─── Server-Side Admin Client (NEVER send to browser) ────────────────────────

/**
 * Service-role Supabase client. Bypasses RLS — can read/write any row.
 * IMPORT THIS ONLY IN ASTRO API ROUTES (src/pages/api/**).
 * The SUPABASE_SERVICE_ROLE_KEY env var is intentionally NOT prefixed with
 * PUBLIC_ so Astro's Vite bundler will refuse to include it in client bundles.
 */
export function createAdminClient() {
  return createClient<Database>(
    getEnv('PUBLIC_SUPABASE_URL'),
    getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        // Service role doesn't use sessions — it acts as the database owner
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

// Singleton for use within a single request (don't share across requests in edge environments)
export const supabaseAdmin = createAdminClient();
