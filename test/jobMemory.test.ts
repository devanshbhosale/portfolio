import { describe, expect, it } from 'vitest'
import {
  appliedSet,
  markApplied,
  savedSet,
  toggleSaved,
  type MemoryStore,
} from '../lib/savedJobs'
import { buildJobPostingLd } from '../lib/jobPosting'
import type { PublicJob } from '../lib/database.types'

function fakeStore(initial: Record<string, string> = {}): MemoryStore {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

describe('saved/applied job memory', () => {
  it('toggles saved state and persists it', () => {
    const store = fakeStore()
    expect(toggleSaved(store, 'a').has('a')).toBe(true)
    expect(savedSet(store).has('a')).toBe(true)
    expect(toggleSaved(store, 'a').has('a')).toBe(false)
    expect(savedSet(store).has('a')).toBe(false)
  })

  it('marks applied idempotently', () => {
    const store = fakeStore()
    markApplied(store, 'a')
    markApplied(store, 'a')
    expect([...appliedSet(store)]).toEqual(['a'])
  })

  it('corrupted JSON degrades to an empty set instead of crashing', () => {
    const store = fakeStore({ 'jobkar:saved': '{oops' })
    expect(savedSet(store)).toEqual(new Set())
  })

  it('non-string entries are dropped on read', () => {
    const store = fakeStore({ 'jobkar:saved': JSON.stringify(['ok', 42, null]) })
    expect([...savedSet(store)]).toEqual(['ok'])
  })

  it('quota errors on write are swallowed', () => {
    const store: MemoryStore = {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceeded') },
      removeItem: () => {},
    }
    expect(() => toggleSaved(store, 'a')).not.toThrow()
  })
})

const seoJob: PublicJob = {
  id: '5f77b9c3-14f0-41c1-9389-b0b24bab28c9',
  title: 'Delivery Driver',
  company: 'Swiggy',
  location: 'Mumbai',
  salary_range: '₹18,000 - ₹22,000',
  experience: '0-2 yrs',
  description: 'Deliver food orders.',
  tags: ['Full-time', 'On-field'],
  is_premium: false,
  is_featured: false,
  featured_until: null,
  expires_at: '2026-09-17T07:51:42.782Z',
  source_link: null,
  apply_url: null,
  created_at: '2026-08-18T07:51:42.782Z',
  approved_at: '2026-08-18T07:51:42.782Z',
}

describe('buildJobPostingLd (Google Jobs)', () => {
  it('emits a valid JobPosting with salary, dates and employment type', () => {
    const ld = buildJobPostingLd(seoJob, 'https://jobkarbe.vercel.app/jobs/x')
    expect(ld['@type']).toBe('JobPosting')
    expect(ld.title).toBe('Delivery Driver')
    expect(ld.hiringOrganization).toEqual({ '@type': 'Organization', name: 'Swiggy' })
    expect(ld.employmentType).toEqual(['FULL_TIME'])
    expect(ld.baseSalary).toEqual({
      '@type': 'MonetaryAmount',
      currency: 'INR',
      value: { '@type': 'QuantitativeValue', minValue: 18000, maxValue: 22000, unitText: 'MONTH' },
    })
    expect(ld.datePosted).toBe('2026-08-18')
    expect(ld.validThrough).toBe('2026-09-17T07:51:42.782Z')
  })

  it('omits salary/employmentType/validThrough when the data is absent', () => {
    const ld = buildJobPostingLd(
      { ...seoJob, salary_range: null, tags: null, expires_at: null },
      'https://jobkarbe.vercel.app/jobs/x',
    )
    expect(ld).not.toHaveProperty('baseSalary')
    expect(ld).not.toHaveProperty('employmentType')
    expect(ld).not.toHaveProperty('validThrough')
    // Falls back to created_at when approved_at is missing.
    expect(buildJobPostingLd({ ...seoJob, approved_at: null }, 'u').datePosted).toBe('2026-08-18')
  })
})
