import { describe, expect, it } from 'vitest'
import { classifyPayments, windowFromEpoch, type PaymentLike } from '../lib/reconcilePayments'

const pay = (over: Partial<PaymentLike> = {}): PaymentLike => ({
  id: 'pay_1',
  status: 'captured',
  amount: 19900,
  currency: 'INR',
  order_id: 'order_1',
  notes: { userId: 'u1', plan: 'Monthly', orderAmount: '19900', referralCode: 'JK-ABC' },
  created_at: 1_755_000_000,
  ...over,
})

describe('classifyPayments', () => {
  it('captured + full attribution → replay candidate with rupees math and price pin', () => {
    const [c] = classifyPayments([pay()]).toProcess
    expect(c).toEqual({
      p_user_id: 'u1',
      p_plan: 'Monthly',
      p_amount: 199, // 19900 paise → ₹199
      p_payment_id: 'pay_1',
      p_order_id: 'order_1',
      p_referral_code: 'JK-ABC',
      p_expected_paise: 19900,
    })
  })

  it('refunded → manual review, never auto-replayed', () => {
    const r = classifyPayments([pay({ status: 'refunded' })])
    expect(r.toProcess).toHaveLength(0)
    expect(r.skipped[0].reason).toBe('refunded_manual_review')
  })

  it('non-captured statuses are skipped with a reason', () => {
    expect(classifyPayments([pay({ status: 'failed' })]).skipped[0].reason).toBe('status_failed')
    expect(classifyPayments([pay({ status: 'authorized' })]).skipped[0].reason).toBe('status_authorized')
  })

  it('missing attribution (no userId/plan notes) is skipped', () => {
    expect(classifyPayments([pay({ notes: { plan: 'Monthly', orderAmount: '19900' } })]).skipped[0].reason).toBe('missing_attribution')
    expect(classifyPayments([pay({ notes: { userId: 'u1', orderAmount: '19900' } })]).skipped[0].reason).toBe('missing_attribution')
  })

  it('unknown plan / wrong currency / bad price pin / amount mismatch are skipped', () => {
    // 'Daily' was never a plan. Legacy 'Quarterly'/'Annual' must NOT be here —
    // they stay fulfillable so pre-change captures can replay.
    expect(classifyPayments([pay({ notes: { userId: 'u1', plan: 'Daily', orderAmount: '19900' } })]).skipped[0].reason).toBe('unknown_plan')
    expect(classifyPayments([pay({ currency: 'USD' })]).skipped[0].reason).toBe('unexpected_currency')
    expect(classifyPayments([pay({ notes: { userId: 'u1', plan: 'Monthly' } })]).skipped[0].reason).toBe('missing_price_pin')
    expect(classifyPayments([pay({ amount: 9900 })]).skipped[0].reason).toBe('amount_mismatch_vs_pin')
  })

  it('retired legacy plans still classify as processable (replay safety)', () => {
    const [q] = classifyPayments([pay({ amount: 49900, notes: { userId: 'u1', plan: 'Quarterly', orderAmount: '49900' } })]).toProcess
    expect(q.p_plan).toBe('Quarterly')
    const [a] = classifyPayments([pay({ amount: 149900, notes: { userId: 'u1', plan: 'Annual', orderAmount: '149900' } })]).toProcess
    expect(a.p_plan).toBe('Annual')
    const [lt] = classifyPayments([pay({ amount: 99900, notes: { userId: 'u1', plan: 'Lifetime', orderAmount: '99900' } })]).toProcess
    expect(lt.p_plan).toBe('Lifetime')
  })

  it('referralCode absent → null, order_id absent → null', () => {
    const [c] = classifyPayments([pay({ order_id: null, amount: 9900, notes: { userId: 'u1', plan: 'Weekly', orderAmount: '9900' } })]).toProcess
    expect(c.p_referral_code).toBeNull()
    expect(c.p_order_id).toBeNull()
  })
})

describe('windowFromEpoch', () => {
  it('clamps days to 1..7', () => {
    const now = 1_755_000_000
    expect(windowFromEpoch(now, 0)).toBe(now - 86_400)
    expect(windowFromEpoch(now, 99)).toBe(now - 7 * 86_400)
  })

  it('1 day default when garbage is passed', () => {
    const now = 1_755_000_000
    expect(windowFromEpoch(now, NaN)).toBe(now - 86_400)
  })
})
