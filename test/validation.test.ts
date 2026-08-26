import { describe, it, expect } from 'vitest'
import { withdrawalSchema, bankConnectSchema, ifscSchema, accountNumberSchema, createOrderSchema } from '@/lib/validation'

describe('withdrawalSchema — request_withdrawal input', () => {
  it('accepts a positive amount and coerces numeric strings', () => {
    expect(withdrawalSchema.safeParse({ amount: 500 }).success).toBe(true)
    expect(withdrawalSchema.safeParse({ amount: '750' }).success).toBe(true)
    expect(withdrawalSchema.safeParse({ amount: '1.5' }).success).toBe(true)
  })

  it('rejects non-positive, zero and absurd amounts', () => {
    expect(withdrawalSchema.safeParse({ amount: 0 }).success).toBe(false)
    expect(withdrawalSchema.safeParse({ amount: -10 }).success).toBe(false)
    // Cap from the schema: amount > 1,000,000 must be rejected.
    expect(withdrawalSchema.safeParse({ amount: 1_000_001 }).success).toBe(false)
    expect(withdrawalSchema.safeParse({}).success).toBe(false)
  })
})

describe('bank account validation (used for settlement)', () => {
  it('accepts a realistic IFSC', () => {
    expect(ifscSchema.safeParse('HDFC0001234').success).toBe(true)
    expect(ifscSchema.safeParse('SBIN0000001').success).toBe(true)
  })

  it('rejects malformed IFSC codes', () => {
    expect(successCases(['HDFC1001234', 'HDFC000123', 'HDFC00012345', 'hdfc0001234'], false)).toBe(true)
  })

  it('account numbers must be 9-18 digits', () => {
    expect(accountNumberSchema.safeParse('123456789').success).toBe(true)
    expect(accountNumberSchema.safeParse('123456789012345678').success).toBe(true)
    expect(anyOfFails(['12345678', '1234567890123456789', '12345678a'])).toBe(true)
  })

  it('bankConnect passes only when all 3 fields are valid', () => {
    expect(
      bankConnectSchema.safeParse({ holderName: 'Ram Kumar', accountNumber: '123456789012', ifsc: 'HDFC0001234' }).success,
    ).toBe(true)
    expect(
      bankConnectSchema.safeParse({ holderName: 'R', accountNumber: '123456789012', ifsc: 'HDFC0001234' }).success,
    ).toBe(false)
    expect(
      bankConnectSchema.safeParse({ holderName: 'Ram Kumar', accountNumber: '12345678', ifsc: 'HDFC0001234' }).success,
    ).toBe(false)
  })
})

describe('createOrderSchema — offered plan gate (server-side)', () => {
  it('accepts every offered plan', () => {
    expect(createOrderSchema.safeParse({ plan: 'Weekly' }).success).toBe(true)
    expect(createOrderSchema.safeParse({ plan: 'Monthly' }).success).toBe(true)
    expect(createOrderSchema.safeParse({ plan: 'Lifetime' }).success).toBe(true)
  })

  it('rejects retired and invented plans', () => {
    // Quarterly/Annual are no longer sold — an order for them must fail here,
    // before any Razorpay order exists.
    expect(createOrderSchema.safeParse({ plan: 'Quarterly' }).success).toBe(false)
    expect(createOrderSchema.safeParse({ plan: 'Annual' }).success).toBe(false)
    expect(createOrderSchema.safeParse({ plan: 'Daily' }).success).toBe(false)
  })

  it('passes a well-formed referral code through', () => {
    const parsed = createOrderSchema.safeParse({ plan: 'Lifetime', referralCode: 'JK-ABCD1234' })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.referralCode).toBe('JK-ABCD1234')
  })
})

// Small helpers to keep the cases readable
function successCases(values: string[], expected: boolean): boolean {
  return values.every((v) => ifscSchema.safeParse(v).success === expected)
}
function anyOfFails(values: string[]): boolean {
  return values.every((v) => accountNumberSchema.safeParse(v).success === false)
}
