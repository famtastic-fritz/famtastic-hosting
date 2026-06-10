import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db/pool.js';

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
function getClientIP(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// Rate limit: 5 submissions per IP per hour.
function checkRateLimit(ip: string): boolean {
  if (ip === 'unknown') return false;

  const now = Date.now();
  const limit = rateLimitStore.get(ip);

  if (!limit || now > limit.resetTime) {
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
  const stripped = raw.replace(/[\r\n]/g, '').trim();
  if ((ALLOWED_SUBJECTS as readonly string[]).includes(stripped)) {
    return stripped as AllowedSubject;
  }
  return 'General';
}

export const POST: APIRoute = async ({ request }) => {
  try {
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
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: 'Too many submissions. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize subject
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

    // Insert into MySQL. ip_address is set server-side; clients cannot supply it.
    await pool.execute(
      'INSERT INTO contact_submissions (name, email, subject, message, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [name.trim(), email.trim(), subject, message.trim(), clientIP, new Date().toISOString().slice(0, 19).replace('T', ' ')]
    );

    // Send email notification via Resend if API key is set
    const resendApiKey = import.meta.env.RESEND_API_KEY;

    if (resendApiKey) {
      try {
        const recipientEmail = 'hello@famtastichosting.com';
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
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }
    } else {
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