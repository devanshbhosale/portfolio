import { describe, it, expect } from 'vitest'
import { settingsFromRow, defaultSettings } from '@/lib/settings'
import type { SiteSettingsRow } from '@/lib/database.types'

function row(overrides: Partial<SiteSettingsRow> = {}): SiteSettingsRow {
  const d = defaultSettings()
  return {
    id: 1,
    price_weekly: d.prices.Weekly,
    price_monthly: d.prices.Monthly,
    price_quarterly: 49900,
    price_annual: 149900,
    price_lifetime: d.prices.Lifetime,
    mrp_weekly: d.mrps.Weekly,
    mrp_monthly: d.mrps.Monthly,
    mrp_lifetime: d.mrps.Lifetime,
    commission_tiers: d.commissionTiers,
    withdraw_threshold: d.withdrawThreshold,
    job_ttl_days: d.jobTtlDays,
    featured_days: d.featuredDays,
    premium_ratio: 0.35, // schema.sql default (owner-only; not in SiteSettings)
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('settingsFromRow — settings drive the money path', () => {
  it('values from the row win over code defaults', () => {
    const s = settingsFromRow(row({ price_weekly: 12345, price_monthly: 54321 }))
    expect(s.prices.Weekly).toBe(12345)
    expect(s.prices.Monthly).toBe(54321)
  })

  it('a zero price is kept, never overwritten by the || default', () => {
    // guards against falsy traps that returned the hardcorded price
    const s = settingsFromRow(row({ price_weekly: 0 }))
    expect(s.prices.Weekly).toBe(0)
  })

  it('exposes only offered plans — Quarterly/Annual are retired from sale', () => {
    const s = settingsFromRow(row())
    expect(Object.keys(s.prices).sort()).toEqual(['Lifetime', 'Monthly', 'Weekly'])
    expect(Object.keys(s.mrps).sort()).toEqual(['Lifetime', 'Monthly', 'Weekly'])
  })

  it('MRP display prices map from their own columns', () => {
    const s = settingsFromRow(row({ mrp_weekly: 29900, mrp_lifetime: 599900 }))
    expect(s.mrps.Weekly).toBe(29900)
    expect(s.mrps.Lifetime).toBe(599900)
  })

  it('null numeric fields fall back to defaults', () => {
    const s = settingsFromRow(
      row({
        withdraw_threshold: null as unknown as number,
        job_ttl_days: null as unknown as number,
        featured_days: null as unknown as number,
        price_lifetime: null as unknown as number,
      }),
    )
    const d = defaultSettings()
    expect(s.withdrawThreshold).toBe(d.withdrawThreshold)
    expect(s.jobTtlDays).toBe(d.jobTtlDays)
    expect(s.featuredDays).toBe(d.featuredDays)
    expect(s.prices.Lifetime).toBe(d.prices.Lifetime)
  })

  it('commission tier values parse through consistently', () => {
    const s = settingsFromRow(
      row({ commission_tiers: { Weekly: 0.1, Monthly: 0.15, Lifetime: 0.3 } }),
    )
    expect(s.commissionTiers.Weekly).toBe(0.1)
    expect(s.commissionTiers.Lifetime).toBe(0.3)
  })
})
