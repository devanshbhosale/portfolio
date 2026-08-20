import { DEFAULT_PRICES_PAISE, DEFAULT_COMMISSION_TIERS, DEFAULT_WITHDRAW_THRESHOLD, DEFAULT_JOB_TTL_DAYS, DEFAULT_FEATURED_DAYS } from './plans'
import type { PlanName, SiteSettingsRow } from './database.types'
import { adminClient } from './server'

export interface SiteSettings {
  prices: Record<PlanName, number>          // paise
  commissionTiers: Record<PlanName, number> // fractions, e.g. 0.25
  withdrawThreshold: number                 // rupees
  jobTtlDays: number
  featuredDays: number
}

const defaults = (): SiteSettings => ({
  prices: { ...DEFAULT_PRICES_PAISE },
  commissionTiers: { ...DEFAULT_COMMISSION_TIERS },
  withdrawThreshold: DEFAULT_WITHDRAW_THRESHOLD,
  jobTtlDays: DEFAULT_JOB_TTL_DAYS,
  featuredDays: DEFAULT_FEATURED_DAYS,
})

function fromRow(row: SiteSettingsRow): SiteSettings {
  const d = defaults()
  return {
    prices: {
      // `!= null`, not `||`: a deliberate free plan (0 paise) must win,
      // otherwise create-order and the webhook use stale defaults.
      Weekly: row.price_weekly != null ? row.price_weekly : d.prices.Weekly,
      Monthly: row.price_monthly != null ? row.price_monthly : d.prices.Monthly,
      Quarterly: row.price_quarterly != null ? row.price_quarterly : d.prices.Quarterly,
      Annual: row.price_annual != null ? row.price_annual : d.prices.Annual,
    },
    commissionTiers: {
      Weekly: Number(row.commission_tiers?.Weekly ?? d.commissionTiers.Weekly),
      Monthly: Number(row.commission_tiers?.Monthly ?? d.commissionTiers.Monthly),
      Quarterly: Number(row.commission_tiers?.Quarterly ?? d.commissionTiers.Quarterly),
      Annual: Number(row.commission_tiers?.Annual ?? d.commissionTiers.Annual),
    },
    withdrawThreshold: row.withdraw_threshold != null ? Number(row.withdraw_threshold) : d.withdrawThreshold,
    jobTtlDays: row.job_ttl_days != null ? row.job_ttl_days : d.jobTtlDays,
    featuredDays: row.featured_days != null ? row.featured_days : d.featuredDays,
  }
}

/** Server-side settings fetch. Money-path fail-closed: a transient Supabase
 *  error must NOT silently fall back to hardcoded code defaults, or the
 *  webhook would validate (and fulfill) a paid order against the wrong
 *  prices. Callers (create-order, webhook, settings GET) convert the throw
 *  into a clean 5xx. */
export async function getSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await adminClient()
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single()
  if (error) throw new Error(`site_settings unavailable: ${error.message}`)
  if (!data) return defaults() // row missing only pre-seed, not an error
  return fromRow(data)
}

export { defaults as defaultSettings, fromRow as settingsFromRow }
