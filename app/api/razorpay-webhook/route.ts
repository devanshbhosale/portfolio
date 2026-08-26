import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { adminClient } from '@/lib/server'
import { FULFILLABLE_PLAN_NAMES } from '@/lib/plans'

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
    refund?: { entity?: { payment_id?: string; amount?: number } }
  }
}

function signatureValid(raw: string, received: string | null): boolean {
  if (!received) return false
  const expected = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(raw).digest('hex')
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Razorpay webhook. Raw-body HMAC (timing-safe), all writes inside the
 *  idempotent process_payment RPC. Fulfillment failures return 5xx so
 *  Razorpay retries the delivery — captured money is never silently
 *  dropped; at-most-once is guaranteed by the unique payment_id overlap. */
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
        // No attribution → cannot fulfill. Retry until razorpay's list
        // is drained, then it shows up in Razorpay's failed deliveries
        // for manual reconciliation.
        console.error(`[webhook] payment ${payment.id} captured without userId/plan notes`)
        return NextResponse.json({ error: 'Missing attribution, retrying' }, { status: 500 })
      }
      // Fulfillable, not offered: a pre-change Quarterly/Annual capture must
      // still fulfill here instead of 500-retrying forever.
      const planName = FULFILLABLE_PLAN_NAMES.find((n) => n === plan)
      if (!planName) {
        console.error(`[webhook] payment ${payment.id} has unknown plan: ${plan}`)
        return NextResponse.json({ error: 'Unknown plan, retrying' }, { status: 500 })
      }
      if (payment.currency !== 'INR') {
        console.error(`[webhook] payment ${payment.id} unexpected currency ${payment.currency}`)
        return NextResponse.json({ error: 'Unexpected currency, retrying' }, { status: 500 })
      }

      // Order-time price pin: create-order fixes the paise amount in
      // notes.orderAmount. When present, fulfillment compares against the
      // pinned amount — a site_settings price change between order and
      // capture can neither strand nor discount a paid order.
      const pinnedPaise = notes.orderAmount ? Number(notes.orderAmount) : NaN
      if (!Number.isFinite(pinnedPaise) || pinnedPaise <= 0) {
        // Bug in our own checkout, or a payment we didn't create — retry +
        // flag rather than trusting a stale/hardcoded price.
        console.error(`[webhook] payment ${payment.id} missing/non-numeric notes.orderAmount`)
        return NextResponse.json({ error: 'Missing price pin, retrying' }, { status: 500 })
      }
      if (payment.amount !== pinnedPaise) {
        console.error(
          `[webhook] payment ${payment.id} amount ${payment.amount} != pinned ${pinnedPaise} INR`,
        )
        return NextResponse.json({ error: 'Amount mismatch vs order, retrying' }, { status: 500 })
      }

      const { error } = await adminClient().rpc('process_payment', {
        p_user_id: userId,
        p_plan: planName,
        p_amount: payment.amount / 100,
        p_payment_id: payment.id,
        p_order_id: payment.order_id ?? null,
        p_referral_code: notes.referralCode || null,
        p_expected_paise: pinnedPaise,
      })
      if (error) {
        console.error(`[webhook] process_payment failed for ${payment.id}:`, error)
        return NextResponse.json({ error: 'Fulfillment failed, retrying' }, { status: 500 })
      }
    } else if (payload.event === 'refund.processed') {
      const refund = payload.payload?.refund?.entity
      const paymentId = refund?.payment_id
      if (paymentId) {
        const { error } = await adminClient().rpc('void_commission', {
          p_payment_id: paymentId,
          p_refund_amount: (refund?.amount ?? 0) / 100,
        })
        if (error) {
          console.error(`[webhook] void_commission failed for ${paymentId}:`, error)
          return NextResponse.json({ error: 'Refund handling failed, retrying' }, { status: 500 })
        }
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
