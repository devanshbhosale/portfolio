import { createHmac, timingSafeEqual } from 'node:crypto'

/** Minimal Dodo Payments REST client — bearer auth against the mode's base
 *  URL. No SDK dependency: the surface we use is three GETs and one POST. */
export const DODO_BASE =
  process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode'
    ? 'https://live.dodopayments.com'
    : 'https://test.dodopayments.com'

export async function dodo<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${DODO_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.DODO_PAYMENTS_API_KEY!}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    // never cache money reads (same Data Cache lesson as the Supabase clients)
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Dodo ${init?.method ?? 'GET'} ${path} → ${res.status}: ${body.slice(0, 300)}`)
  }
  return (await res.json()) as T
}

/** Standard Webhooks signature check (Dodo follows the spec):
 *  HMAC-SHA256 over `webhook-id.webhook-timestamp.rawBody` with the base64
 *  secret from the dashboard (`whsec_…`), compared timing-safe against every
 *  space-separated signature in `webhook-signature`. */
export function dodoWebhookSignatureValid(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
): boolean {
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_KEY!
  if (!headers.id || !headers.timestamp || !headers.signature || !secret) return false
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = createHmac('sha256', secretBytes)
    .update(`${headers.id}.${headers.timestamp}.${rawBody}`)
    .digest('base64')
  return headers.signature.split(' ').some((sig) => {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    return a.length === b.length && timingSafeEqual(a, b)
  })
}

/** Shape of GET /payments/{id} and the payment.succeeded webhook `data`. */
export interface DodoPayment {
  payment_id: string
  status: string
  total_amount: number // smallest currency unit (paise for INR)
  currency: string
  metadata: Record<string, string> | null
  subscription_id?: string | null
  created_at?: string
}

export function dodoEnvConfigured(): boolean {
  return Boolean(process.env.DODO_PAYMENTS_API_KEY)
}
