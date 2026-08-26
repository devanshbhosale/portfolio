// Pure classification for the payment reconciler — same fulfillment
// discipline as the webhook (attribution, plan, currency, order-time price
// pin), so a replayed payment can never fulfill on weaker terms.
import type { FulfillablePlanName } from './database.types'
import { FULFILLABLE_PLAN_NAMES } from './plans'

const PLANS: readonly string[] = FULFILLABLE_PLAN_NAMES

export interface PaymentLike {
  id: string
  status: string
  amount: number // paise
  currency: string
  order_id: string | null
  notes: Record<string, string> | null
  created_at: number // epoch seconds
}

export interface ReplayCandidate {
  p_user_id: string
  p_plan: FulfillablePlanName
  p_amount: number // rupees
  p_payment_id: string
  p_order_id: string | null
  p_referral_code: string | null
  p_expected_paise: number
}

export interface ClassifyResult {
  toProcess: ReplayCandidate[]
  skipped: { id: string; reason: string }[]
}

export function classifyPayments(payments: PaymentLike[]): ClassifyResult {
  const toProcess: ReplayCandidate[] = []
  const skipped: ClassifyResult['skipped'] = []

  for (const p of payments) {
    if (p.status === 'refunded') {
      skipped.push({ id: p.id, reason: 'refunded_manual_review' })
      continue
    }
    if (p.status !== 'captured') {
      skipped.push({ id: p.id, reason: `status_${p.status}` })
      continue
    }

    const notes = p.notes ?? {}
    const { userId, plan, orderAmount } = notes
    if (!userId || !plan) {
      skipped.push({ id: p.id, reason: 'missing_attribution' })
      continue
    }
    if (!PLANS.includes(plan)) {
      skipped.push({ id: p.id, reason: 'unknown_plan' })
      continue
    }
    if (p.currency !== 'INR') {
      skipped.push({ id: p.id, reason: 'unexpected_currency' })
      continue
    }
    const pinnedPaise = orderAmount !== undefined ? Number(orderAmount) : NaN
    if (!Number.isFinite(pinnedPaise) || pinnedPaise <= 0) {
      skipped.push({ id: p.id, reason: 'missing_price_pin' })
      continue
    }
    if (p.amount !== pinnedPaise) {
      skipped.push({ id: p.id, reason: 'amount_mismatch_vs_pin' })
      continue
    }

    toProcess.push({
      p_user_id: userId,
      p_plan: plan as FulfillablePlanName,
      p_amount: p.amount / 100,
      p_payment_id: p.id,
      p_order_id: p.order_id ?? null,
      p_referral_code: notes.referralCode || null,
      p_expected_paise: pinnedPaise,
    })
  }

  return { toProcess, skipped }
}

/** `from` epoch for razorpay.payments.all, days clamped 1..7. */
export function windowFromEpoch(nowEpochSec: number, days: number): number {
  const d = Math.min(7, Math.max(1, Math.round(days) || 1))
  return nowEpochSec - d * 24 * 60 * 60
}
