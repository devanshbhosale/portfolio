import { describe, expect, it } from 'vitest'
import { classifyPayments, windowFromIso, type PaymentLike } from '../lib/reconcilePayments'
import { createCheckoutSchema, verifyPaymentSchema } from '../lib/validation'

const pay = (over: Partial<PaymentLike> = {}): PaymentLike => ({
  payment_id: 'pay_1',
  status: 'succeeded',
  total_amount: 19900,
  currency: 'INR',
  metadata: { userId: 'u1', plan: 'Monthly', expectedAmount: '19900', referralCode: 'JK-ABC' },
  subscription_id: null,
  ...over,
})

describe('classifyPayments', () => {
  it('succeeded + full attribution → replay candidate with rupees math and price pin', () => {
    const [c] = classifyPayments([pay()]).toProcess
    expect(c).toEqual({
      p_user_id: 'u1',
      p_plan: 'Monthly',
      p_amount: 199, // 19900 paise → ₹199
      p_payment_id: 'pay_1',
      p_order_id: null,
      p_referral_code: 'JK-ABC',
      p_expected_paise: 19900,
    })
  })

  it('refunded → manual review, never auto-replayed', () => {
    const r = classifyPayments([pay({ status: 'refunded' })])
    expect(r.toProcess).toHaveLength(0)
    expect(r.skipped[0].reason).toBe('refunded_manual_review')
  })

  it('non-succeeded statuses are skipped with a reason', () => {
    expect(classifyPayments([pay({ status: 'failed' })]).skipped[0].reason).toBe('status_failed')
    expect(classifyPayments([pay({ status: 'processing' })]).skipped[0].reason).toBe('status_processing')
  })

  it('missing attribution (no userId/plan metadata) is skipped', () => {
    expect(classifyPayments([pay({ metadata: { plan: 'Monthly', expectedAmount: '19900' } })]).skipped[0].reason).toBe('missing_attribution')
    expect(classifyPayments([pay({ metadata: { userId: 'u1', expectedAmount: '19900' } })]).skipped[0].reason).toBe('missing_attribution')
    expect(classifyPayments([pay({ metadata: null })]).skipped[0].reason).toBe('missing_attribution')
  })

  it('unknown plan / wrong currency / bad price pin / amount mismatch are skipped', () => {
    // 'Daily' was never a plan. Legacy 'Quarterly'/'Annual' must NOT be here —
    // they stay fulfillable so pre-change captures can replay.
    expect(classifyPayments([pay({ metadata: { userId: 'u1', plan: 'Daily', expectedAmount: '19900' } })]).skipped[0].reason).toBe('unknown_plan')
    expect(classifyPayments([pay({ currency: 'USD' })]).skipped[0].reason).toBe('unexpected_currency')
    expect(classifyPayments([pay({ metadata: { userId: 'u1', plan: 'Monthly' } })]).skipped[0].reason).toBe('missing_price_pin')
    expect(classifyPayments([pay({ total_amount: 9900 })]).skipped[0].reason).toBe('amount_mismatch_vs_pin')
  })

  it('retired legacy plans still classify as processable (replay safety)', () => {
    const [q] = classifyPayments([pay({ total_amount: 49900, metadata: { userId: 'u1', plan: 'Quarterly', expectedAmount: '49900' } })]).toProcess
    expect(q.p_plan).toBe('Quarterly')
    const [a] = classifyPayments([pay({ total_amount: 149900, metadata: { userId: 'u1', plan: 'Annual', expectedAmount: '149900' } })]).toProcess
    expect(a.p_plan).toBe('Annual')
    const [lt] = classifyPayments([pay({ total_amount: 99900, metadata: { userId: 'u1', plan: 'Lifetime', expectedAmount: '99900' } })]).toProcess
    expect(lt.p_plan).toBe('Lifetime')
  })

  it('referralCode absent → null, subscription absent → null', () => {
    const [c] = classifyPayments([pay({ total_amount: 9900, metadata: { userId: 'u1', plan: 'Weekly', expectedAmount: '9900' } })]).toProcess
    expect(c.p_referral_code).toBeNull()
    expect(c.p_order_id).toBeNull()
  })
})

describe('windowFromIso', () => {
  it('clamps days into 1..7 and returns an ISO stamp days back', () => {
    const now = Date.UTC(2026, 8, 16, 6, 0, 0)
    expect(windowFromIso(now, 7)).toBe('2026-09-09T06:00:00.000Z')
    expect(windowFromIso(now, 30)).toBe('2026-09-09T06:00:00.000Z') // clamped
    expect(windowFromIso(now, 0)).toBe('2026-09-15T06:00:00.000Z') // clamped to 1
    expect(windowFromIso(now, NaN)).toBe('2026-09-15T06:00:00.000Z') // 1-day default
  })
})

describe('checkout validation — offered plan gate (server-side)', () => {
  it('accepts every offered plan', () => {
    expect(createCheckoutSchema.safeParse({ plan: 'Weekly' }).success).toBe(true)
    expect(createCheckoutSchema.safeParse({ plan: 'Monthly' }).success).toBe(true)
    expect(createCheckoutSchema.safeParse({ plan: 'Lifetime' }).success).toBe(true)
  })

  it('rejects retired and invented plans', () => {
    // Quarterly/Annual are no longer sold — a checkout for them must fail here,
    // before any Dodo session exists.
    expect(createCheckoutSchema.safeParse({ plan: 'Quarterly' }).success).toBe(false)
    expect(createCheckoutSchema.safeParse({ plan: 'Annual' }).success).toBe(false)
    expect(createCheckoutSchema.safeParse({ plan: 'Daily' }).success).toBe(false)
  })

  it('passes a well-formed referral code through', () => {
    const parsed = createCheckoutSchema.safeParse({ plan: 'Lifetime', referralCode: 'JK-ABCD1234' })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.referralCode).toBe('JK-ABCD1234')
  })
})

describe('verifyPaymentSchema — Dodo payment id shape', () => {
  it('accepts prefixed Dodo payment ids', () => {
    expect(verifyPaymentSchema.safeParse({ payment_id: 'pay_2IjeQm4hqU6RA4Z4kwDee' }).success).toBe(true)
  })

  it('rejects ids that could smuggle PostgREST filter syntax', () => {
    expect(verifyPaymentSchema.safeParse({ payment_id: 'pay_x)id=eq.other' }).success).toBe(false)
    expect(verifyPaymentSchema.safeParse({ payment_id: 'pay_a,pay_b' }).success).toBe(false)
    expect(verifyPaymentSchema.safeParse({ payment_id: 'order_123' }).success).toBe(false)
    expect(verifyPaymentSchema.safeParse({}).success).toBe(false)
  })
})
