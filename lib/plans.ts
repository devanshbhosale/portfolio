import type { PlanName } from './database.types'

export const PLAN_NAMES = ['Weekly', 'Monthly', 'Quarterly', 'Annual'] as const

/** Plan durations in days — must match process_payment() in schema.sql. */
export const PLAN_DURATIONS: Record<PlanName, number> = {
  Weekly: 7,
  Monthly: 30,
  Quarterly: 90,
  Annual: 365,
}

/** Default prices in paise — must match the site_settings seed row. */
export const DEFAULT_PRICES_PAISE: Record<PlanName, number> = {
  Weekly: 9900,
  Monthly: 19900,
  Quarterly: 49900,
  Annual: 149900,
}

/** Strikethrough display prices (rupees) from the original design. */
export const ORIGINAL_PRICES: Record<PlanName, number> = {
  Weekly: 199,
  Monthly: 399,
  Quarterly: 999,
  Annual: 2999,
}

export const DEFAULT_COMMISSION_TIERS: Record<PlanName, number> = {
  Weekly: 0.2,
  Monthly: 0.2,
  Quarterly: 0.25,
  Annual: 0.25,
}

export const DEFAULT_WITHDRAW_THRESHOLD = 500
export const DEFAULT_JOB_TTL_DAYS = 30
export const DEFAULT_FEATURED_DAYS = 7

export const PLAN_PERKS: Record<PlanName, string[]> = {
  Weekly: ['All premium job listings', 'Direct HR contacts', 'Priority support'],
  Monthly: ['All premium job listings', 'Direct HR contacts', 'Referral bonus boost', 'Weekly job alerts'],
  Quarterly: ['All monthly perks', 'Save 50%', 'Resume review', 'Featured profile'],
  Annual: ['All quarterly perks', 'Save 60%', 'Dedicated career coach', 'Early access to new jobs'],
}

export const rupees = (paise: number) => paise / 100
