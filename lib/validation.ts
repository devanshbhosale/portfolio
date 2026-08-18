import { z } from 'zod'
import { PLAN_NAMES } from './plans'

export const referralCodeSchema = z.string().regex(/^JK-[A-Z0-9]{8}$/, 'Referral code must look like JK-XXXXXXXX')

export const httpUrlSchema = z.url().refine(
  (u) => u.startsWith('http://') || u.startsWith('https://'),
  { message: 'Only http(s) URLs are allowed' },
)

export const parseLinkSchema = z.object({ url: httpUrlSchema })

export const submitJobSchema = z.object({
  title: z.string().trim().min(3).max(120),
  company: z.string().trim().min(2).max(120),
  location: z.string().trim().max(120).optional().default(''),
  salary_range: z.string().trim().max(80).optional().default(''),
  experience: z.string().trim().max(80).optional().default(''),
  description: z.string().trim().max(5000).optional().default(''),
  contact_info: z.string().trim().max(300).optional().default(''),
  source_link: httpUrlSchema.optional().or(z.literal('')).or(z.undefined()),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).optional().default([]),
  is_premium: z.boolean().optional().default(false),
})
export type SubmitJobInput = z.infer<typeof submitJobSchema>

export const createOrderSchema = z.object({
  plan: z.enum(PLAN_NAMES),
  referralCode: referralCodeSchema.optional().or(z.literal('')),
})

export const verifyPaymentSchema = z.object({
  razorpay_payment_id: z.string().min(6).max(64),
  razorpay_order_id: z.string().min(6).max(64),
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

export const renewJobSchema = z.object({ jobId: z.string().uuid() })

export const updateSettingsSchema = z.object({
  price_weekly: z.coerce.number().int().min(100).max(10_000_000),
  price_monthly: z.coerce.number().int().min(100).max(10_000_000),
  price_quarterly: z.coerce.number().int().min(100).max(10_000_000),
  price_annual: z.coerce.number().int().min(100).max(10_000_000),
  commission_tiers: z.object({
    Weekly: z.coerce.number().min(0).max(0.9),
    Monthly: z.coerce.number().min(0).max(0.9),
    Quarterly: z.coerce.number().min(0).max(0.9),
    Annual: z.coerce.number().min(0).max(0.9),
  }),
  withdraw_threshold: z.coerce.number().min(1).max(100_000),
  job_ttl_days: z.coerce.number().int().min(1).max(365),
  featured_days: z.coerce.number().int().min(1).max(90),
})
