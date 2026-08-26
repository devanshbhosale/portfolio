import type { FulfillablePlanName, PlanName } from './database.types'

/** Plans shown for sale. Drives checkout validation (zod) and every UI list.
 *  Quarterly/Annual were retired 2026-08-26 — see LEGACY_PLAN_NAMES below. */
export const PLAN_NAMES = ['Weekly', 'Monthly', 'Lifetime'] as const

/** Retired plans no longer sold, but still fulfillable: historical buyers keep
 *  their expiry and pre-change captured payments must replay cleanly. The DB
 *  CHECK constraints accept these; only create-order validation excludes them. */
export const LEGACY_PLAN_NAMES = ['Quarterly', 'Annual'] as const

/** Everything process_payment() can fulfill — webhook + reconciler use this. */
export const FULFILLABLE_PLAN_NAMES = [...PLAN_NAMES, ...LEGACY_PLAN_NAMES] as const satisfies readonly FulfillablePlanName[]

/** Plan durations in days — must match process_payment() in schema.sql.
 *  Lifetime is a 100-year interval so the global
 *  `premium_expires_at > now()` rule keeps working unchanged everywhere. */
export const PLAN_DURATIONS_DAYS: Record<FulfillablePlanName, number> = {
  Weekly: 7,
  Monthly: 30,
  Lifetime: 36_500,
  Quarterly: 90,
  Annual: 365,
}

/** Default charged prices in paise — fallback when site_settings is unreadable;
 *  live values come from /api/settings and are dashboard-editable. */
export const DEFAULT_PRICES_PAISE: Record<PlanName, number> = {
  Weekly: 9900,
  Monthly: 19900,
  Lifetime: 99900,
}

/** Default strike-through display prices in paise ("original" MRP). Purely
 *  cosmetic — never used in the money path; live MRPs are dashboard-editable. */
export const DEFAULT_MRPS_PAISE: Record<PlanName, number> = {
  Weekly: 19900,
  Monthly: 39900,
  Lifetime: 499900,
}

export const DEFAULT_COMMISSION_TIERS: Record<PlanName, number> = {
  Weekly: 0.2,
  Monthly: 0.2,
  Lifetime: 0.25,
}

export const DEFAULT_WITHDRAW_THRESHOLD = 500
export const DEFAULT_JOB_TTL_DAYS = 30
export const DEFAULT_FEATURED_DAYS = 7

/** One-line differentiator under each card's price on the pricing page. */
export const PLAN_TAGLINES: Record<PlanName, string> = {
  Weekly: 'Perfect for an active job hunt week',
  Monthly: 'Full month of unlimited premium access',
  Lifetime: 'Pay once — premium forever',
}

/** Billing note under each price (jobs24x-style "total billed" line). */
export const PLAN_BILLING_NOTES: Record<PlanName, string> = {
  Weekly: 'Billed once · 7-day access',
  Monthly: 'Billed monthly · cancel anytime',
  Lifetime: 'One-time payment · never expires',
}

/** Shared perks rendered once under all three cards ("Everything included"). */
export const SHARED_FEATURES = [
  'Access to hidden jobs not on LinkedIn',
  'Know real salaries before applying',
  'Advanced filters & smart search',
  'Unlimited saved jobs & job alerts',
  'Early access before everyone else',
  'Direct apply links, no middlemen',
  'Priority support',
] as const

export const rupees = (paise: number) => paise / 100
