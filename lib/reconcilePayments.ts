// Pure classification for the payment reconciler — same fulfillment
// discipline as the webhook (attribution, plan, currency, order-time price
// pin), so a replayed payment can never fulfill on weaker terms.
import type { FulfillablePlanName } from './database.types'
import { FULFILLABLE_PLAN_NAMES } from './plans'

const PLANS: readonly string[] = FULFILLABLE_PLAN_NAMES

export interface PaymentLike {
  payment_id: string
  status: string
  total_amount: number // smallest currency unit (paise for INR)
  currency: string
  metadata: Record<string, string> | null
  subscription_id?: string | null
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
      skipped.push({ id: p.payment_id, reason: 'refunded_manual_review' })
      continue
    }
    if (p.status !== 'succeeded') {
      skipped.push({ id: p.payment_id, reason: `status_${p.status}` })
      continue
    }

    const notes = p.metadata ?? {}
    const { userId, plan, expectedAmount } = notes
    if (!userId || !plan) {
      skipped.push({ id: p.payment_id, reason: 'missing_attribution' })
      continue
    }
    if (!PLANS.includes(plan)) {
      skipped.push({ id: p.payment_id, reason: 'unknown_plan' })
      continue
    }
    if (p.currency !== 'INR') {
      skipped.push({ id: p.payment_id, reason: 'unexpected_currency' })
      continue
    }
    const pinnedPaise = expectedAmount !== undefined ? Number(expectedAmount) : NaN
    if (!Number.isFinite(pinnedPaise) || pinnedPaise <= 0) {
      skipped.push({ id: p.payment_id, reason: 'missing_price_pin' })
      continue
    }
    if (p.total_amount !== pinnedPaise) {
      skipped.push({ id: p.payment_id, reason: 'amount_mismatch_vs_pin' })
      continue
    }

    toProcess.push({
      p_user_id: userId,
      p_plan: plan as FulfillablePlanName,
      p_amount: p.total_amount / 100,
      p_payment_id: p.payment_id,
      p_order_id: p.subscription_id ?? null,
      p_referral_code: notes.referralCode || null,
      p_expected_paise: pinnedPaise,
    })
  }

  return { toProcess, skipped }
}

/** ISO `from` for Dodo GET /payments?created_at_gte, days clamped 1..7. */
export function windowFromIso(nowMs: number, days: number): string {
  const d = Math.min(7, Math.max(1, Math.round(days) || 1))
  return new Date(nowMs - d * 24 * 60 * 60 * 1000).toISOString()
}
