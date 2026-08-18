import { describe, it, expect } from 'vitest'
import {
  round2,
  commissionFor,
  availableCommission,
  holdingCommission,
  lifetimeCommission,
  extendedExpiry,
} from '@/lib/money'
import type { PremiumPurchaseRow } from '@/lib/database.types'

const now = new Date('2024-06-15T12:00:00Z').getTime()

function makePurchase(overrides: Partial<PremiumPurchaseRow> = {}): PremiumPurchaseRow {
  return {
    id: 'p1',
    user_id: 'u1',
    plan: 'Monthly',
    amount: 199,
    payment_id: 'pay_1',
    order_id: 'ord_1',
    referral_code_used: 'JK-ABC123',
    referrer_user_id: 'ref1',
    commission_amount: 39.8,
    withdrawn_amount: 0,
    commission_status: 'available',
    premium_granted_until: null,
    refunded_at: null,
    created_at: new Date(now).toISOString(),
    ...overrides,
  }
}

describe('lib/money — commission & balance math', () => {
  it('round2 rounds to 2 decimals', () => {
    expect(round2(1.005)).toBe(1.01)
    expect(round2(1.004)).toBe(1.0)
    expect(round2(39.8)).toBe(39.8)
    expect(round2(39.8000000001)).toBe(39.8)
  })

  it('commissionFor multiplies amount by tier', () => {
    expect(commissionFor(199, 0.2)).toBe(39.8)
    expect(commissionFor(499, 0.25)).toBe(124.75)
    expect(commissionFor(100, 0)).toBe(0)
    expect(commissionFor(100, 1)).toBe(100)
  })

  it('availableCommission sums released + past-holding-period pending', () => {
    const purchases: PremiumPurchaseRow[] = [
      makePurchase({ commission_status: 'available', commission_amount: 50, withdrawn_amount: 0 }),
      makePurchase({ commission_status: 'available', commission_amount: 30, withdrawn_amount: 10 }),
      makePurchase({ commission_status: 'pending', created_at: new Date(now - 20 * 60 * 1000).toISOString(), commission_amount: 40, withdrawn_amount: 0 }), // past 15 min
      makePurchase({ commission_status: 'pending', created_at: new Date(now - 5 * 60 * 1000).toISOString(), commission_amount: 20, withdrawn_amount: 0 }), // inside holding
      makePurchase({ commission_status: 'voided', commission_amount: 100, withdrawn_amount: 0 }),
      makePurchase({ commission_status: 'withdrawn', commission_amount: 50, withdrawn_amount: 50 }),
    ]
    // 50 + 20 + 40 = 110
    expect(availableCommission(purchases, now)).toBe(110)
  })

  it('holdingCommission sums only pending inside the 15-min window', () => {
    const purchases: PremiumPurchaseRow[] = [
      makePurchase({ commission_status: 'pending', created_at: new Date(now - 5 * 60 * 1000).toISOString(), commission_amount: 40, withdrawn_amount: 0 }),
      makePurchase({ commission_status: 'pending', created_at: new Date(now - 20 * 60 * 1000).toISOString(), commission_amount: 30, withdrawn_amount: 0 }), // past 15 min
    ]
    expect(holdingCommission(purchases, now)).toBe(40)
  })

  it('lifetimeCommission sums all commissions ever earned', () => {
    const purchases: PremiumPurchaseRow[] = [
      makePurchase({ commission_status: 'available', commission_amount: 50 }),
      makePurchase({ commission_status: 'withdrawn', commission_amount: 30 }),
      makePurchase({ commission_status: 'voided', commission_amount: 10 }),
      makePurchase({ commission_status: 'pending', commission_amount: 20 }),
    ]
    expect(lifetimeCommission(purchases)).toBe(110)
  })

  it('extendedExpiry never shortens an active subscription', () => {
    const future = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
    const past = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago

    // active plan: extend from expiry (not from now)
    expect(extendedExpiry(future, 7, now)).toEqual(new Date(new Date(future).getTime() + 7 * 24 * 60 * 60 * 1000))
    // expired plan: extend from now
    expect(extendedExpiry(past, 7, now)).toEqual(new Date(now + 7 * 24 * 60 * 60 * 1000))
    // null expiry: extend from now
    expect(extendedExpiry(null, 7, now)).toEqual(new Date(now + 7 * 24 * 60 * 60 * 1000))
  })
})