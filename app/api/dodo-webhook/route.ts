import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/server'
import { dodoWebhookSignatureValid, type DodoPayment } from '@/lib/dodo'
import { FULFILLABLE_PLAN_NAMES } from '@/lib/plans'

interface WebhookPayload {
  type: string
  data: DodoPayment & { payload_type?: string }
}

/** Dodo webhook. Standard-Webhooks signature (timing-safe, raw body), all
 *  writes inside the idempotent process_payment RPC. Fulfillment failures
 *  return 5xx so Dodo retries the delivery — captured money is never
 *  silently dropped; at-most-once is guaranteed by the unique payment_id
 *  overlap in the ledger. */
export async function POST(req: Request) {
  const raw = await req.text()

  if (
    !dodoWebhookSignatureValid(raw, {
      id: req.headers.get('webhook-id'),
      timestamp: req.headers.get('webhook-timestamp'),
      signature: req.headers.get('webhook-signature'),
    })
  ) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let payload: WebhookPayload
  try {
    payload = JSON.parse(raw) as WebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  try {
    if (payload.type === 'payment.succeeded' || payload.type === 'payment.failed') {
      const payment = payload.data
      if (!payment?.payment_id) return NextResponse.json({ received: true })

      if (payload.type === 'payment.failed') {
        console.warn(`[dodo-webhook] payment failed: ${payment.payment_id}`)
        return NextResponse.json({ received: true })
      }

      const notes = payment.metadata ?? {}
      const { userId, plan } = notes
      if (!userId || !plan) {
        // No attribution → cannot fulfill. Retry until Dodo's retries are
        // drained, then it shows in Dodo's webhook logs for manual replay.
        console.error(`[dodo-webhook] payment ${payment.payment_id} succeeded without userId/plan metadata`)
        return NextResponse.json({ error: 'Missing attribution, retrying' }, { status: 500 })
      }
      // Fulfillable, not offered: a pre-change Quarterly/Annual capture must
      // still fulfill here instead of 500-retrying forever.
      const planName = FULFILLABLE_PLAN_NAMES.find((n) => n === plan)
      if (!planName) {
        console.error(`[dodo-webhook] payment ${payment.payment_id} has unknown plan: ${plan}`)
        return NextResponse.json({ error: 'Unknown plan, retrying' }, { status: 500 })
      }
      if (payment.currency !== 'INR') {
        console.error(`[dodo-webhook] payment ${payment.payment_id} unexpected currency ${payment.currency}`)
        return NextResponse.json({ error: 'Unexpected currency, retrying' }, { status: 500 })
      }

      // Order-time price pin: create-checkout pins the site_settings paise in
      // metadata.expectedAmount. When present, fulfillment compares against
      // it — a site_settings price change between checkout and capture can
      // neither strand nor discount a paid order. (The Dodo product price is
      // what the customer actually paid; the pin catches checkout/config
      // drift between the two sources.)
      const pinnedPaise = notes.expectedAmount ? Number(notes.expectedAmount) : NaN
      if (!Number.isFinite(pinnedPaise) || pinnedPaise <= 0) {
        console.error(`[dodo-webhook] payment ${payment.payment_id} missing/non-numeric metadata.expectedAmount`)
        return NextResponse.json({ error: 'Missing price pin, retrying' }, { status: 500 })
      }
      if (payment.total_amount !== pinnedPaise) {
        console.error(
          `[dodo-webhook] payment ${payment.payment_id} amount ${payment.total_amount} != pinned ${pinnedPaise} INR`,
        )
        return NextResponse.json({ error: 'Amount mismatch vs checkout, retrying' }, { status: 500 })
      }

      const { error } = await adminClient().rpc('process_payment', {
        p_user_id: userId,
        p_plan: planName,
        p_amount: payment.total_amount / 100,
        p_payment_id: payment.payment_id,
        p_order_id: payment.subscription_id ?? null,
        p_referral_code: notes.referralCode || null,
        p_expected_paise: pinnedPaise,
      })
      if (error) {
        console.error(`[dodo-webhook] process_payment failed for ${payment.payment_id}:`, error)
        return NextResponse.json({ error: 'Fulfillment failed, retrying' }, { status: 500 })
      }
    } else if (payload.type === 'refund.succeeded') {
      const refund = payload.data as unknown as {
        payment_id?: string
        amount?: number
      }
      if (refund?.payment_id) {
        const { error } = await adminClient().rpc('void_commission', {
          p_payment_id: refund.payment_id,
          p_refund_amount: (refund.amount ?? 0) / 100,
        })
        if (error) {
          console.error(`[dodo-webhook] void_commission failed for ${refund.payment_id}:`, error)
          return NextResponse.json({ error: 'Refund handling failed, retrying' }, { status: 500 })
        }
      }
    } else {
      console.log(`[dodo-webhook] event ${payload.type} acknowledged`)
    }
  } catch (err) {
    console.error('[dodo-webhook] handler error:', err)
    // 500 → Dodo retries the delivery.
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
