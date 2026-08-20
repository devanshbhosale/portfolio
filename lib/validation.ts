import { z } from 'zod'
import { PLAN_NAMES } from './plans'

export const referralCodeSchema = z.string().regex(/^JK-[A-Z0-9]{8}$/, 'Referral code must look like JK-XXXXXXXX')

export const createOrderSchema = z.object({
  plan: z.enum(PLAN_NAMES),
  referralCode: referralCodeSchema.optional().or(z.literal('')),
})

export const verifyPaymentSchema = z.object({
  // Razorpay IDs are prefixed identifiers — anchored to that alphabet so
  // they can never smuggle PostgREST filter syntax into an eq() lookup.
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9_]+$/, 'Invalid payment id'),
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9_]+$/, 'Invalid order id'),
})

export const ifscSchema = z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'IFSC must look like HDFC0001234')
export const accountNumberSchema = z.string().regex(/^\d{9,18}$/, 'Account number must be 9-18 digits')

export const bankConnectSchema = z.object({
  holderName: z.string().trim().min(2).max(120),
  accountNumber: accountNumberSchema,
  ifsc: ifscSchema,
})

export const withdrawalSchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000),
})
