import { describe, it, expect } from 'vitest'
import { withdrawalSchema, bankConnectSchema, ifscSchema, accountNumberSchema, panSchema, upiIdSchema, upiConnectSchema, reportSchema, createOrderSchema } from '@/lib/validation'

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

  it('carries the payout method, defaulting to bank', () => {
    const upi = withdrawalSchema.safeParse({ amount: 500, method: 'upi' })
    expect(upi.success).toBe(true)
    if (upi.success) expect(upi.data.method).toBe('upi')
    const fallback = withdrawalSchema.safeParse({ amount: 500 })
    expect(fallback.success).toBe(true)
    if (fallback.success) expect(fallback.data.method).toBe('bank')
    expect(withdrawalSchema.safeParse({ amount: 500, method: 'paypal' }).success).toBe(false)
  })
})

describe('UPI ID validation (instant payout rail)', () => {
  it('rejects malformed UPI IDs', () => {
    for (const bad of ['x@i', '@upi', 'ram@', 'ram kumar@upi', 'Ram@upi', ''])
      expect(upiIdSchema.safeParse(bad).success).toBe(false)
  })

  it('accepts realistic UPI IDs', () => {
    expect(upiIdSchema.safeParse('ram.kumar@upi').success).toBe(true)
    expect(upiIdSchema.safeParse('ramkumar-1@oksbi').success).toBe(true)
    expect(upiIdSchema.safeParse('9876543210@ybl').success).toBe(true)
    expect(upiIdSchema.safeParse('ram@paytm').success).toBe(true)
  })

  it('upiConnect requires a valid UPI ID', () => {
    expect(upiConnectSchema.safeParse({ upiId: 'ram.kumar@upi' }).success).toBe(true)
    expect(upiConnectSchema.safeParse({ upiId: 'nope' }).success).toBe(false)
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

  it('bankConnect passes only when all 4 fields are valid (PAN required)', () => {
    const base = { holderName: 'Ram Kumar', accountNumber: '123456789012', ifsc: 'HDFC0001234' }
    expect(bankConnectSchema.safeParse({ ...base, pan: 'ABCDE1234F' }).success).toBe(true)
    // PAN is required — omitted or blank fails.
    expect(bankConnectSchema.safeParse(base).success).toBe(false)
    expect(bankConnectSchema.safeParse({ ...base, pan: '' }).success).toBe(false)
    expect(bankConnectSchema.safeParse({ holderName: 'R', accountNumber: '123456789012', ifsc: 'HDFC0001234', pan: 'ABCDE1234F' }).success).toBe(false)
    expect(bankConnectSchema.safeParse({ holderName: 'Ram Kumar', accountNumber: '12345678', ifsc: 'HDFC0001234', pan: 'ABCDE1234F' }).success).toBe(false)
  })

  it('PAN must be 5 letters, 4 digits, 1 letter', () => {
    expect(panSchema.safeParse('ABCDE1234F').success).toBe(true)
    for (const bad of ['ABCDE1234', 'abcde1234f', 'ABCDe1234F', 'ABCD1234EFG', ''])
      expect(panSchema.safeParse(bad).success).toBe(false)
  })
})

describe('reportSchema — listing reports', () => {
  const jobId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

  it('accepts a valid report with and without a note', () => {
    expect(reportSchema.safeParse({ jobId, reason: 'fake_scam' }).success).toBe(true)
    expect(reportSchema.safeParse({ jobId, reason: 'other', note: 'looks off' }).success).toBe(true)
  })

  it('rejects unknown reasons, bad ids, and long notes', () => {
    expect(reportSchema.safeParse({ jobId, reason: 'spam' }).success).toBe(false)
    expect(reportSchema.safeParse({ jobId: 'not-a-uuid', reason: 'fake_scam' }).success).toBe(false)
    expect(reportSchema.safeParse({ jobId, reason: 'fake_scam', note: 'x'.repeat(501) }).success).toBe(false)
    expect(reportSchema.safeParse({ reason: 'fake_scam' }).success).toBe(false)
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
