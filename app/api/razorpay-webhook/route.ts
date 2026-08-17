import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { adminClient } from '@/lib/server'
import { getSiteSettings } from '@/lib/settings'
import type { PlanName } from '@/lib/database.types'

interface WebhookPayment {
  id: string
  order_id?: string
  amount: number
  currency: string
  notes?: Record<string, string>
}
interface WebhookPayload {
  event: string
  payload?: {
    payment?: { entity?: WebhookPayment }
    refund?: { entity?: { payment_id?: string } }
  }
}

function signatureValid(raw: string, received: string | null): boolean {
  if (!received) return false
  const expected = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(raw).digest('hex')
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Razorpay webhook. Raw-body HMAC (timing-safe), amount verified against
 *  site_settings, all writes inside the idempotent process_payment RPC. */
export async function POST(req: Request) {
  const raw = await req.text()

  if (!signatureValid(raw, req.headers.get('x-razorpay-signature'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let payload: WebhookPayload
  try {
    payload = JSON.parse(raw) as WebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  try {
    if (payload.event === 'payment.captured') {
      const payment = payload.payload?.payment?.entity
      if (!payment?.id) return NextResponse.json({ received: true })

      const notes = payment.notes ?? {}
      const { userId, plan } = notes
      if (!userId || !plan) {
        // Never grant without attribution — log for manual reconciliation.
        console.error(`[webhook] payment ${payment.id} captured without userId/plan notes`)
        return NextResponse.json({ received: true })
      }

      const settings = await getSiteSettings()
      const expectedAmount = settings.prices[plan as PlanName]
      if (!expectedAmount || payment.amount !== expectedAmount || payment.currency !== 'INR') {
        console.error(
          `[webhook] payment ${payment.id} amount/currency mismatch: got ${payment.amount} ${payment.currency}, expected ${expectedAmount} INR`,
        )
        return NextResponse.json({ received: true })
      }

      const { error } = await adminClient().rpc('process_payment', {
        p_user_id: userId,
        p_plan: plan,
        p_amount: payment.amount / 100,
        p_payment_id: payment.id,
        p_order_id: payment.order_id ?? null,
        p_referral_code: notes.referralCode || null,
      })
      if (error) console.error(`[webhook] process_payment failed for ${payment.id}:`, error)
    } else if (payload.event === 'refund.processed') {
      const paymentId = payload.payload?.refund?.entity?.payment_id
      if (paymentId) {
        const { error } = await adminClient().rpc('void_commission', { p_payment_id: paymentId })
        if (error) console.error(`[webhook] void_commission failed for ${paymentId}:`, error)
      }
    } else if (payload.event === 'payment.failed') {
      const payment = payload.payload?.payment?.entity
      console.warn(`[webhook] payment failed: ${payment?.id ?? 'unknown'} (order ${payment?.order_id ?? 'unknown'})`)
    } else {
      console.log(`[webhook] event ${payload.event} acknowledged`)
    }
  } catch (err) {
    console.error('[webhook] handler error:', err)
    // 500 → Razorpay retries the delivery.
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
