import { describe, it, expect } from 'vitest'
import { settingsFromRow, defaultSettings } from '@/lib/settings'
import type { SiteSettingsRow } from '@/lib/database.types'

function row(overrides: Partial<SiteSettingsRow> = {}): SiteSettingsRow {
  const d = defaultSettings()
  return {
    id: 1,
    price_weekly: d.prices.Weekly,
    price_monthly: d.prices.Monthly,
    price_quarterly: d.prices.Quarterly,
    price_annual: d.prices.Annual,
    commission_tiers: d.commissionTiers,
    withdraw_threshold: d.withdrawThreshold,
    job_ttl_days: d.jobTtlDays,
    featured_days: d.featuredDays,
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

  it('null numeric fields fall back to defaults', () => {
    const s = settingsFromRow(
      row({
        withdraw_threshold: null as unknown as number,
        job_ttl_days: null as unknown as number,
        featured_days: null as unknown as number,
        price_annual: null as unknown as number,
      }),
    )
    const d = defaultSettings()
    expect(s.withdrawThreshold).toBe(d.withdrawThreshold)
    expect(s.jobTtlDays).toBe(d.jobTtlDays)
    expect(s.featuredDays).toBe(d.featuredDays)
    expect(s.prices.Annual).toBe(d.prices.Annual)
  })

  it('commission tier values parse through consistently', () => {
    const s = settingsFromRow(
      row({ commission_tiers: { Weekly: 0.1, Monthly: 0.15, Quarterly: 0.2, Annual: 0.3 } }),
    )
    expect(s.commissionTiers.Weekly).toBe(0.1)
    expect(s.commissionTiers.Annual).toBe(0.3)
  })
})
