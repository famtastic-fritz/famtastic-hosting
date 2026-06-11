/**
 * PayPal Orders API v2 — server-side only.
 * Supports sandbox and live via PAYPAL_ENV env var.
 */

const BASE = import.meta.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const id = import.meta.env.PAYPAL_CLIENT_ID
  const secret = import.meta.env.PAYPAL_SECRET
  const credentials = Buffer.from(`${id}:${secret}`).toString('base64')

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    throw new Error(`PayPal auth failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json() as { access_token: string }
  return data.access_token
}

// ─── Create Order ─────────────────────────────────────────────────────────────

export async function createPayPalOrder(totalCents: number): Promise<string> {
  const token = await getAccessToken()
  const value = (totalCents / 100).toFixed(2)

  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value,
          },
          description: 'FAMtastic Hosting — services purchase',
        },
      ],
    }),
  })

  if (!res.ok) {
    throw new Error(`PayPal create order failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json() as { id: string }
  return data.id
}

// ─── Capture Order ────────────────────────────────────────────────────────────

export interface CaptureResult {
  paypalOrderId: string
  status: string
  payerEmail: string | null
  amountCaptured: string
}

export async function capturePayPalOrder(paypalOrderId: string): Promise<CaptureResult> {
  const token = await getAccessToken()

  const res = await fetch(`${BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`PayPal capture failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json() as {
    id: string
    status: string
    payer?: { email_address?: string }
    purchase_units?: Array<{
      payments?: { captures?: Array<{ amount?: { value?: string } }> }
    }>
  }

  const captured = data.purchase_units?.[0]?.payments?.captures?.[0]
  return {
    paypalOrderId: data.id,
    status: data.status,
    payerEmail: data.payer?.email_address ?? null,
    amountCaptured: captured?.amount?.value ?? '0.00',
  }
}
