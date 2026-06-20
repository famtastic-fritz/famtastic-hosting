// Transactional email helpers using Resend.
// Falls back to console logging when no API key is configured (local dev).

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY ?? '';
const DEFAULT_FROM = import.meta.env.EMAIL_FROM ?? 'orders@famtastichosting.com';
const ADMIN_EMAIL = import.meta.env.ADMIN_EMAIL ?? 'hello@famtastichosting.com';

interface SendOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(options: SendOptions): Promise<{ ok: boolean; id?: string; error?: string }> {
  const to = Array.isArray(options.to) ? options.to : [options.to];
  const validTo = to.filter((e) => isValidEmail(e));
  if (validTo.length === 0) {
    return { ok: false, error: 'No valid recipient addresses' };
  }

  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not configured; email not sent.', { subject: options.subject, to: validTo });
    return { ok: false, error: 'Email transport not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from ?? DEFAULT_FROM,
        to: validTo,
        subject: options.subject,
        text: options.text,
        html: options.html,
        reply_to: options.replyTo,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown Resend error');
      console.error('[email] Resend API error:', response.status, errText);
      return { ok: false, error: errText };
    }

    const data = (await response.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[email] send failed:', message);
    return { ok: false, error: message };
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Order email templates ──────────────────────────────────────────────────

interface OrderItem {
  name: string;
  quantity: number;
  priceUSD: number;
}

export function sendAdminOrderNotification(options: {
  orderIds: string[];
  paypalOrderId: string;
  payerEmail: string;
  amountUSD: string;
  items: OrderItem[];
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { orderIds, paypalOrderId, payerEmail, amountUSD, items } = options;
  const itemLines = items
    .map((i) => `• ${i.name} x${i.quantity} — $${i.priceUSD.toFixed(2)}`)
    .join('\n');

  const text = `New FAMtastic Hosting order received

PayPal Order: ${paypalOrderId}
Local Order IDs: ${orderIds.join(', ')}
Customer PayPal Email: ${payerEmail}
Total Collected: $${amountUSD}

Items:
${itemLines}

Fulfill this order in the admin dashboard:
https://famtastichosting.com/admin/orders
`;

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `New order — $${amountUSD} from ${payerEmail}`,
    text,
    from: DEFAULT_FROM,
    replyTo: payerEmail,
  });
}

export function sendCustomerReceipt(options: {
  to: string;
  orderIds: string[];
  paypalOrderId: string;
  amountUSD: string;
  items: OrderItem[];
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { to, orderIds, paypalOrderId, amountUSD, items } = options;
  const itemLines = items
    .map((i) => `• ${i.name} x${i.quantity} — $${i.priceUSD.toFixed(2)}`)
    .join('\n');

  const text = `Thank you for your FAMtastic Hosting order!

Your payment has been received and your order is being prepared.

PayPal Order: ${paypalOrderId}
Local Order IDs: ${orderIds.join(', ')}
Total: $${amountUSD}

Items:
${itemLines}

You will receive another email once your services are active.

Need help? Reply to this email or visit https://famtastichosting.com/contact
`;

  return sendEmail({
    to,
    subject: `Receipt for FAMtastic Hosting order ${orderIds[0] ?? ''}`,
    text,
    from: DEFAULT_FROM,
    replyTo: ADMIN_EMAIL,
  });
}

export function sendCustomerOrderActive(options: {
  to: string;
  orderId: string;
  productName: string;
  amountUSD: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { to, orderId, productName, amountUSD } = options;

  const text = `Your FAMtastic Hosting order is now active!

Order ID: ${orderId}
Product: ${productName}
Amount: $${amountUSD}

You can manage your services from your dashboard:
https://famtastichosting.com/dashboard

Welcome aboard. If you have any questions, reply to this email or visit https://famtastichosting.com/contact
`;

  return sendEmail({
    to,
    subject: `Your FAMtastic Hosting order ${orderId} is active`,
    text,
    from: DEFAULT_FROM,
    replyTo: ADMIN_EMAIL,
  });
}
