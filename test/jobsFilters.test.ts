import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILTERS,
  filterJobs,
  filtersActive,
  filtersFromParams,
  filtersToParams,
  matchTag,
  parseSalaryRange,
} from '../lib/jobsFilters'
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
  ...over,
})

describe('filtersFromParams / filtersToParams', () => {
  it('round-trips a full filter state', () => {
    const f = { search: 'driver', location: 'Mumbai', tag: 'Full-time', tier: 'premium' as const }
    expect(filtersFromParams(filtersToParams(f).toString())).toEqual(f)
  })

  it('defaults are omitted from the URL', () => {
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe('')
  })

  it('accepts legacy param names and rejects garbage tiers', () => {
    expect(filtersFromParams('?search=cook&category=QA&tier=banana')).toEqual({
      search: 'cook', location: '', tag: 'QA', tier: 'all',
    })
  })

  it('an empty query yields defaults', () => {
    expect(filtersFromParams('')).toEqual(DEFAULT_FILTERS)
  })
})

describe('filtersActive', () => {
  it('is false only for the all-default state', () => {
    expect(filtersActive(DEFAULT_FILTERS)).toBe(false)
    expect(filtersActive({ ...DEFAULT_FILTERS, tier: 'saved' })).toBe(true)
    expect(filtersActive({ ...DEFAULT_FILTERS, tag: 'QA' })).toBe(true)
  })
})

describe('matchTag', () => {
  it('matches exactly, case-insensitively — no substring false positives', () => {
    expect(matchTag(['QA', 'Security'], 'qa')).toBe(true)
    expect(matchTag(['Security'], 'sec')).toBe(false)
    expect(matchTag(null, '')).toBe(true)
    expect(matchTag(['Full-time'], 'full-time ')).toBe(true)
  })
})

describe('filterJobs', () => {
  const premium = job({ id: 'p1', title: 'Electrician', company: 'Urban Company', is_premium: true, tags: ['Skilled'] })
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

  it('search matches title or company, case-insensitively', () => {
    expect(filterJobs(all, { ...DEFAULT_FILTERS, search: 'swiggy' }, new Set()).map((j) => j.id)).toEqual(['f1'])
    expect(filterJobs(all, { ...DEFAULT_FILTERS, search: 'ELECTRIC' }, new Set()).map((j) => j.id)).toEqual(['p1'])
  })

  it('combines filters with AND semantics', () => {
    expect(
      filterJobs(all, { search: 'electrician', location: '', tag: 'skilled', tier: 'premium' }, new Set()).map((j) => j.id),
    ).toEqual(['p1'])
    expect(
      filterJobs(all, { search: 'electrician', location: '', tag: 'skilled', tier: 'free' }, new Set()),
    ).toEqual([])
  })
})

describe('parseSalaryRange', () => {
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
