import { describe, expect, it } from 'vitest'
import { isTeaser, redactJob } from '../lib/jobRedaction'
import type { PublicJob } from '../lib/database.types'

const job = (over: Partial<PublicJob> = {}): PublicJob => ({
  id: 'id-1',
  title: 'Senior Delivery Fleet Coordinator',
  company: 'Swiggy',
  location: 'Mumbai',
  salary_range: '₹18,000 - ₹22,000',
  experience: '0-2 yrs',
  description: 'Coordinate the fleet.',
  tags: ['Full-time'],
  is_premium: true,
  is_featured: false,
  featured_until: null,
  expires_at: null,
  source_link: 'https://example.com/source',
  apply_url: 'https://example.com/apply',
  created_at: '2026-08-01T00:00:00Z',
  approved_at: '2026-08-01T00:00:00Z',
  ...over,
})

describe('redactJob', () => {
  it('locked: strips apply_url, description, source_link, full title and real company', () => {
    const t = redactJob(job(), false)
    expect(isTeaser(t)).toBe(true)
    if (!isTeaser(t)) return
    expect('apply_url' in t).toBe(false)
    expect('description' in t).toBe(false)
    expect('source_link' in t).toBe(false)
    expect('approved_at' in t).toBe(false)
    expect(t.title_prefix).toBe('Senior Delivery Fleet Co')
    expect(t.title_prefix.length).toBeLessThanOrEqual(24)
    expect(t.company).toBe('Top Employer')
    expect(t.locked).toBe(true)
  })

  it('locked: keeps the teaser fields used by cards', () => {
    const t = redactJob(job(), false)
    if (!isTeaser(t)) throw new Error('expected teaser')
    expect(t.id).toBe('id-1')
    expect(t.location).toBe('Mumbai')
    expect(t.salary_range).toBe('₹18,000 - ₹22,000')
    expect(t.experience).toBe('0-2 yrs')
    expect(t.tags).toEqual(['Full-time'])
    expect(t.created_at).toBe('2026-08-01T00:00:00Z')
  })

  it('unlocked premium: full row passes through untouched', () => {
    const full = job()
    expect(redactJob(full, true)).toBe(full)
  })

  it('free job: full row even for anon', () => {
    const free = job({ is_premium: false })
    expect(redactJob(free, false)).toBe(free)
  })

  it('title_prefix slices at 24 chars exactly', () => {
    const t = redactJob(job({ title: 'x'.repeat(100) }), false)
    if (!isTeaser(t)) throw new Error('expected teaser')
    expect(t.title_prefix).toBe('x'.repeat(24))
  })
})

describe('isTeaser', () => {
  it('discriminates teasers from full jobs', () => {
    expect(isTeaser(redactJob(job(), false))).toBe(true)
    expect(isTeaser(redactJob(job(), true))).toBe(false)
    expect(isTeaser(job())).toBe(false)
  })
})
