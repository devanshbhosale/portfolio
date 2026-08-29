import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILTERS,
  apiParams,
  filterJobs,
  filtersActive,
  filtersFromParams,
  filtersToParams,
  parseSalaryRange,
} from '../lib/jobsFilters'
import { validateJobsParams } from '../lib/jobsQuery'
import type { PublicJob } from '../lib/database.types'

const job = (over: Partial<PublicJob> = {}): PublicJob => ({
  id: 'id-1',
  title: 'Delivery Driver',
  company: 'Swiggy',
  location: 'Mumbai',
  salary_range: '₹18,000 - ₹22,000',
  experience: '0-2 yrs',
  description: 'x',
  tags: ['Full-time', 'On-field'],
  is_premium: false,
  is_featured: false,
  featured_until: null,
  expires_at: null,
  source_link: null,
  apply_url: null,
  created_at: '2026-08-01T00:00:00Z',
  approved_at: '2026-08-01T00:00:00Z',
  salary_monthly_min: 18000,
  salary_monthly_max: 22000,
  exp_min_months: 0,
  exp_max_months: 24,
  ...over,
})

describe('filtersFromParams / filtersToParams', () => {
  it('round-trips a full filter state', () => {
    const f = {
      search: 'driver', location: 'Mumbai', tag: 'Full-time', tier: 'premium' as const,
      salary: 'under20k' as const, exp: 'twoToFive' as const, posted: '7', sort: 'newest' as const,
    }
    expect(filtersFromParams(filtersToParams(f).toString())).toEqual(f)
  })

  it('defaults are omitted from the URL', () => {
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe('')
  })

  it('accepts legacy param names and rejects garbage tiers', () => {
    expect(filtersFromParams('?search=cook&category=QA&tier=banana')).toEqual({
      ...DEFAULT_FILTERS,
      search: 'cook', tag: 'QA',
    })
  })

  it('an empty query yields defaults', () => {
    expect(filtersFromParams('')).toEqual(DEFAULT_FILTERS)
  })

  it('garbage bucket params fall back to defaults instead of hard-erroring later', () => {
    expect(filtersFromParams('?posted=99&salary=bogus&exp=ten&sort=random')).toEqual(DEFAULT_FILTERS)
  })
})

describe('apiParams (page → /api/jobs contract)', () => {
  it('never sends tier=saved — Saved is client-side, the API would 400', () => {
    const p = apiParams({ ...DEFAULT_FILTERS, tier: 'saved', search: 'x' }, 2)
    expect(p.get('tier')).toBeNull()
    expect(p.get('q')).toBe('x')
    expect(p.get('page')).toBe('2')
  })

  it('output always passes validateJobsParams for every tier and filter combo', () => {
    for (const tier of ['all', 'free', 'premium', 'saved'] as const) {
      const f = {
        ...DEFAULT_FILTERS, tier, search: 'driver', salary: 'over35k' as const,
        exp: 'fresher' as const, posted: '7', sort: 'salary' as const,
      }
      expect(validateJobsParams(Object.fromEntries(apiParams(f, 1))).ok).toBe(true)
    }
  })
})

describe('filtersActive', () => {
  it('is false only for the all-default state', () => {
    expect(filtersActive(DEFAULT_FILTERS)).toBe(false)
    expect(filtersActive({ ...DEFAULT_FILTERS, tier: 'saved' })).toBe(true)
    expect(filtersActive({ ...DEFAULT_FILTERS, tag: 'QA' })).toBe(true)
    expect(filtersActive({ ...DEFAULT_FILTERS, salary: 'over35k' })).toBe(true)
    expect(filtersActive({ ...DEFAULT_FILTERS, posted: '7' })).toBe(true)
    expect(filtersActive({ ...DEFAULT_FILTERS, sort: 'salary' })).toBe(true)
  })
})

describe('filterJobs (tier/saved only — text and buckets are server-side)', () => {
  const premium = job({ id: 'p1', is_premium: true })
  const free = job({ id: 'f1' })
  const all = [premium, free]

  it('tier=premium keeps only premium rows', () => {
    expect(filterJobs(all, { ...DEFAULT_FILTERS, tier: 'premium' }, new Set()).map((j) => j.id)).toEqual(['p1'])
  })

  it('tier=free keeps only free rows', () => {
    expect(filterJobs(all, { ...DEFAULT_FILTERS, tier: 'free' }, new Set()).map((j) => j.id)).toEqual(['f1'])
  })

  it('tier=saved keeps only locally saved rows', () => {
    expect(filterJobs(all, { ...DEFAULT_FILTERS, tier: 'saved' }, new Set(['p1'])).map((j) => j.id)).toEqual(['p1'])
  })

  it('ignores text filters — the server already applied them', () => {
    expect(filterJobs(all, { ...DEFAULT_FILTERS, search: 'nomatch' }, new Set())).toEqual(all)
  })
})

describe('parseSalaryRange (shared with jobPosting SEO structured data)', () => {
  it('parses Indian monthly ranges', () => {
    expect(parseSalaryRange('₹18,000 - ₹22,000')).toEqual({ min: 18000, max: 22000, unitText: 'MONTH' })
  })

  it('parses LPA notation into yearly', () => {
    expect(parseSalaryRange('₹4.5 LPA')).toEqual({ min: 450000, max: 450000, unitText: 'YEAR' })
  })

  it('parses a single bare number', () => {
    expect(parseSalaryRange('20000')).toEqual({ min: 20000, max: 20000, unitText: 'MONTH' })
  })

  it('returns null for text without numbers', () => {
    expect(parseSalaryRange('Best in industry')).toBeNull()
    expect(parseSalaryRange(null)).toBeNull()
    expect(parseSalaryRange('')).toBeNull()
  })
})
