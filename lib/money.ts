import type { PremiumPurchaseRow } from './database.types'

export const HOLDING_PERIOD_MS = 15 * 60 * 1000

type CommissionRow = Pick<
  PremiumPurchaseRow,
  'commission_amount' | 'withdrawn_amount' | 'commission_status' | 'created_at'
>

/** Commission the referrer can spend right now: released commissions plus
 *  pending ones past the 15-minute holding period (lazy release — the cron
 *  only formalizes the status flip). Must mirror approve_withdrawal(). */
export function availableCommission(purchases: CommissionRow[], now = Date.now()): number {
  return round2(
    purchases
      .filter(
        (p) =>
          (p.commission_status === 'available' ||
            (p.commission_status === 'pending' && now - new Date(p.created_at).getTime() >= HOLDING_PERIOD_MS)) &&
          p.commission_amount > p.withdrawn_amount,
      )
      .reduce((sum, p) => sum + (p.commission_amount - p.withdrawn_amount), 0),
  )
}

/** Commission earned but still inside the holding window. */
export function holdingCommission(purchases: CommissionRow[], now = Date.now()): number {
  return round2(
    purchases
      .filter(
        (p) =>
          p.commission_status === 'pending' &&
          now - new Date(p.created_at).getTime() < HOLDING_PERIOD_MS,
      )
      .reduce((sum, p) => sum + (p.commission_amount - p.withdrawn_amount), 0),
  )
}

/** Total commission ever earned (includes withdrawn and holding). */
export function lifetimeCommission(purchases: CommissionRow[]): number {
  return round2(purchases.reduce((sum, p) => sum + p.commission_amount, 0))
}

/** Premium expiry after buying `days` more: never shortens an active plan. */
export function extendedExpiry(currentExpiry: string | null, days: number, now = Date.now()): Date {
  const base = currentExpiry ? new Date(currentExpiry).getTime() : 0
  return new Date(Math.max(base, now) + days * 24 * 60 * 60 * 1000)
}

/** Tiered referral commission in rupees. */
export function commissionFor(amountRupees: number, tier: number): number {
  return round2(amountRupees * tier)
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
