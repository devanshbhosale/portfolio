import { describe, expect, it } from 'vitest'
import { PAGE_SIZE, buildSearchArgs, validateJobsParams, type JobsParams } from '../lib/jobsQuery'

describe('validateJobsParams', () => {
  it('defaults: tier all, page 0, empty filters', () => {
    expect(validateJobsParams({})).toEqual({
      ok: true,
      value: { tier: 'all', q: '', location: '', tag: '', salary: '', exp: '', posted: '', sort: '', page: 0 },
    })
  })

  it('accepts valid values', () => {
    const r = validateJobsParams({
      tier: 'premium', q: 'driver', location: 'Mumbai', tag: 'Full-time',
      salary: 'under20k', exp: 'fresher', posted: '7', sort: 'newest', page: '2',
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.page).toBe(2)
      expect(r.value.salary).toBe('under20k')
      expect(r.value.exp).toBe('fresher')
      expect(r.value.posted).toBe('7')
      expect(r.value.sort).toBe('newest')
    }
  })

  it('rejects a bad tier', () => {
    expect(validateJobsParams({ tier: 'saved' }).ok).toBe(false)
  })

  it('rejects bucket/whitelist violations', () => {
    expect(validateJobsParams({ salary: 'under10k' }).ok).toBe(false)
    expect(validateJobsParams({ exp: 'ten' }).ok).toBe(false)
    expect(validateJobsParams({ posted: '2' }).ok).toBe(false)
    expect(validateJobsParams({ posted: '1;drop' }).ok).toBe(false)
    expect(validateJobsParams({ sort: 'random' }).ok).toBe(false)
  })

  it('rejects a negative or non-integer page', () => {
    expect(validateJobsParams({ page: '-1' }).ok).toBe(false)
    expect(validateJobsParams({ page: '1.5' }).ok).toBe(false)
    expect(validateJobsParams({ page: 'abc' }).ok).toBe(false)
  })

  it('strips matching-breaking characters from q and clamps length', () => {
    const r = validateJobsParams({ q: 'dri,ver(100)%abc_' + 'x'.repeat(200) })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.q).not.toMatch(/[,()%_"']/)
      expect(r.value.q.length).toBeLessThanOrEqual(100)
    }
  })
})

describe('buildSearchArgs', () => {
  it('empty params → empty tokens, no filters, default sort, page 0', () => {
    expect(buildSearchArgs({
      tier: 'all', q: '', location: '', tag: '', salary: '', exp: '', posted: '', sort: '', page: 0,
    })).toEqual({
      p_q_tokens: [],
      p_location_variants: [],
      p_tag: null,
      p_premium: null,
      p_salary_min: null,
      p_salary_max: null,
      p_exp_min: null,
      p_exp_max: null,
      p_posted_days: null,
      p_sort: 'default',
      p_page: 0,
      p_page_size: PAGE_SIZE,
    })
  })

  it('splits q into AND-tokens and passes location through the alias expander', () => {
    const args = buildSearchArgs({
      tier: 'all', q: 'delivery driver', location: 'Gurgaon', tag: '', salary: '', exp: '', posted: '', sort: '', page: 0,
    })
    expect(args.p_q_tokens).toEqual(['delivery', 'driver'])
    expect(args.p_location_variants).toEqual(['gurgaon', 'gurugram'])
  })

  it('routes location words typed into q into the location OR-group', () => {
    const args = buildSearchArgs({
      tier: 'all', q: 'driver banglore', location: '', tag: '', salary: '', exp: '', posted: '', sort: '', page: 0,
    })
    expect(args.p_q_tokens).toEqual(['driver'])
    expect(args.p_location_variants).toEqual(['bangalore', 'bengaluru', 'banglore'])
  })

  it('maps tier to the premium flag', () => {
    const base: Omit<JobsParams, 'tier'> = { q: '', location: '', tag: '', salary: '', exp: '', posted: '', sort: '', page: 0 }
    expect(buildSearchArgs({ tier: 'free', ...base }).p_premium).toBe(false)
    expect(buildSearchArgs({ tier: 'premium', ...base }).p_premium).toBe(true)
    expect(buildSearchArgs({ tier: 'all', ...base }).p_premium).toBe(null)
  })

  it('maps salary, experience, posted and sort to RPC args', () => {
    const args = buildSearchArgs({
      tier: 'all', q: '', location: '', tag: 'QA', salary: 'to35k', exp: 'fivePlus',
      posted: '30', sort: 'salary', page: 3,
    })
    expect(args.p_salary_min).toBe(20000)
    expect(args.p_salary_max).toBe(35000)
    expect(args.p_exp_min).toBe(60)
    expect(args.p_exp_max).toBe(null)
    expect(args.p_posted_days).toBe(30)
    expect(args.p_sort).toBe('salary')
    expect(args.p_tag).toBe('QA')
    expect(args.p_page).toBe(3)
  })
})

describe('PAGE_SIZE', () => {
  it('is the page contract shared by API and feed (9 = .range span)', () => {
    expect(PAGE_SIZE).toBe(9)
  })
})
