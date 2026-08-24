import { describe, expect, it } from 'vitest'
import { PAGE_SIZE, describeFilters, validateJobsParams } from '../lib/jobsQuery'

describe('validateJobsParams', () => {
  it('defaults: tier all, page 0, empty strings', () => {
    expect(validateJobsParams({})).toEqual({
      ok: true,
      value: { tier: 'all', q: '', location: '', tag: '', page: 0 },
    })
  })

  it('accepts valid values', () => {
    const r = validateJobsParams({ tier: 'premium', q: 'driver', location: 'Mumbai', tag: 'Full-time', page: '2' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.page).toBe(2)
  })

  it('rejects a bad tier', () => {
    expect(validateJobsParams({ tier: 'saved' }).ok).toBe(false)
  })

  it('rejects a negative or non-integer page', () => {
    expect(validateJobsParams({ page: '-1' }).ok).toBe(false)
    expect(validateJobsParams({ page: '1.5' }).ok).toBe(false)
    expect(validateJobsParams({ page: 'abc' }).ok).toBe(false)
  })

  it('strips PostgREST-breaking characters from q and clamps length', () => {
    const r = validateJobsParams({ q: 'dri,ver(100)%abc' + 'x'.repeat(200) })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.q).not.toMatch(/[,()%]/)
      expect(r.value.q.length).toBeLessThanOrEqual(100)
    }
  })
})

describe('describeFilters', () => {
  it('maps q onto an or-list over title and company', () => {
    const f = describeFilters({ tier: 'all', q: 'driver', location: '', tag: '', page: 0 })
    expect(f.or).toBe('title.ilike.%driver%,company.ilike.%driver%')
    expect(f.locationIlike).toBeNull()
    expect(f.tagContains).toBeNull()
    expect(f.premiumEq).toBeNull()
  })

  it('maps tier and tag', () => {
    expect(describeFilters({ tier: 'free', q: '', location: '', tag: '', page: 0 }).premiumEq).toBe(false)
    expect(describeFilters({ tier: 'premium', q: '', location: '', tag: '', page: 0 }).premiumEq).toBe(true)
    expect(describeFilters({ tier: 'all', q: '', location: '', tag: 'qa', page: 0 }).tagContains).toBe('qa')
  })
})

describe('PAGE_SIZE', () => {
  it('is the page contract shared by API and feed (9 = current .range span)', () => {
    expect(PAGE_SIZE).toBe(9)
  })
})
