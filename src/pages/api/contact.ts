import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

// ─── Rate limiting ────────────────────────────────────────────────────────────
// In-memory store. Capped at MAX_ENTRIES to prevent unbounded memory growth.
// Oldest entries are evicted when the cap is hit.
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX_ENTRIES = 10_000;

function evictOldestRateLimitEntry(): void {
  // Map iteration order is insertion order — first key is oldest
  const firstKey = rateLimitStore.keys().next().value;
  if (firstKey !== undefined) {
    rateLimitStore.delete(firstKey);
  }
}

// Helper to get client IP address.
// NOTE: In production Astro, prefer context.clientAddress (set by the adapter)
// over header-based detection, which is spoofable. Header fallback is kept
// for local dev only.
function getClientIP(request: Request): string {
  // Cloudflare sets this header after verifying the real IP — more trustworthy
  // than x-forwarded-for when behind CF. Both are still spoofable if the
  // server is hit directly, which is why unknown IPs are rejected below.
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// Rate limit: 5 submissions per IP per hour.
// Returns false if the IP is unknown (reject rather than allow spoofed bypass).
function checkRateLimit(ip: string): boolean {
  // Reject unknown IPs — allows attacker to bypass by omitting headers.
  if (ip === 'unknown') return false;

  const now = Date.now();
  const limit = rateLimitStore.get(ip);

  if (!limit || now > limit.resetTime) {
    // Evict oldest entry if cap is reached before inserting
    if (!limit && rateLimitStore.size >= RATE_LIMIT_MAX_ENTRIES) {
      evictOldestRateLimitEntry();
    }
    rateLimitStore.set(ip, { count: 1, resetTime: now + 3_600_000 });
    return true;
  }

  if (limit.count >= 5) return false;

  limit.count++;
  return true;
}

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Allowed subject values — validated against enum to prevent header injection.
const ALLOWED_SUBJECTS = ['General', 'Billing', 'Technical', 'Sales'] as const;
type AllowedSubject = (typeof ALLOWED_SUBJECTS)[number];

function sanitizeSubject(raw: string | null): AllowedSubject {
  if (!raw) return 'General';
  // Strip carriage returns and newlines that could inject additional headers
  const stripped = raw.replace(/[\r\n]/g, '').trim();
  if ((ALLOWED_SUBJECTS as readonly string[]).includes(stripped)) {
    return stripped as AllowedSubject;
  }
  return 'General';
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse form data
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const rawSubject = formData.get('subject') as string | null;
    const message = formData.get('message') as string;
    const honeypot = formData.get('honeypot') as string;

    const clientIP = getClientIP(request);

    // Honeypot check - silently return success if filled
    if (honeypot && honeypot.trim()) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check.
    // Also rejects unknown IPs (prevents header-omission bypass).
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: 'Too many submissions. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize subject — validated against allowed enum; CR/LF stripped
    const subject = sanitizeSubject(rawSubject);

    // Field validation
    if (!name || !name.trim()) {
      return new Response(
        JSON.stringify({ error: 'Name is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!email || !email.trim() || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Valid email address is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!message || message.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'Message must be at least 10 characters.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing');
      return new Response(
        JSON.stringify({ error: 'Server configuration error.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Save to Supabase. ip_address is set server-side; clients cannot supply it.
    const { error: dbError } = await supabase.from('contact_submissions').insert({
      name: name.trim(),
      email: email.trim(),
      subject,
      message: message.trim(),
      ip_address: clientIP,
      created_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to save submission.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send email notification via Resend if API key is set
    const resendApiKey = import.meta.env.RESEND_API_KEY;

    if (resendApiKey) {
      try {
        const recipientEmail = 'hello@famtastichosting.com';
        // subject is already an enum value — safe to interpolate.
        // name is NOT interpolated into the Subject header to prevent
        // header injection; it remains in the body only.
        const emailSubject = `New contact form submission — ${subject}`;
        const emailBody = `New contact form submission:\n\nSubject: ${subject}\nSubmitted: ${new Date().toISOString()}\n\nMessage:\n${message.trim()}\n`;

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'contact@famtastichosting.com',
            to: recipientEmail,
            subject: emailSubject,
            text: emailBody,
          }),
        });

        if (!response.ok) {
          const resendError = await response.text();
          console.error('Resend API error:', resendError);
          // Don't fail the submission if email sending fails
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Graceful degradation: don't fail submission if email fails
      }
    } else {
      // No PII logged — submission is already persisted to the database.
      console.warn('[contact] Email transport unavailable — submission saved to DB only');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
