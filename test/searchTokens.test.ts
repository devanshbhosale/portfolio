import { describe, expect, it } from 'vitest'
import {
  EXP_BUCKETS, MAX_QUERY_LEN, MAX_TOKENS, POSTED_DAYS, SALARY_BUCKETS, SORTS,
  locationVariants, tokenizeQuery,
} from '../lib/searchTokens'

describe('tokenizeQuery', () => {
  it('lowercases and splits on whitespace/punctuation', () => {
    expect(tokenizeQuery('Delivery Driver, Mumbai')).toEqual({
      tokens: ['delivery', 'driver', 'mumbai'],
      locationVariants: [],
    })
  })

  it('strips ILIKE wildcards and breaking characters', () => {
    expect(tokenizeQuery('driver_100% (night) "shift"')).toEqual({
      tokens: ['driver', '100', 'night', 'shift'],
      locationVariants: [],
    })
  })

  it('caps tokens at 6 and drops words over 30 chars', () => {
    const r = tokenizeQuery('a b c d e f g h')
    expect(r.tokens).toHaveLength(MAX_TOKENS)
    expect(r.tokens).not.toContain('h')
    expect(tokenizeQuery('x'.repeat(31)).tokens).toEqual([])
  })

  it('clamps the total query to 100 chars', () => {
    expect(tokenizeQuery('word '.repeat(100)).tokens.length).toBeLessThanOrEqual(MAX_TOKENS)
    const long = tokenizeQuery('a '.repeat(60))
    expect(long.tokens.join('').length).toBeLessThanOrEqual(MAX_QUERY_LEN)
  })

  it('routes location alias words into the location OR-group', () => {
    expect(tokenizeQuery('banglore')).toEqual({
      tokens: [],
      locationVariants: ['bangalore', 'bengaluru', 'banglore'],
    })
    expect(tokenizeQuery('driver bangalore')).toEqual({
      tokens: ['driver'],
      locationVariants: ['bangalore', 'bengaluru', 'banglore'],
    })
    expect(tokenizeQuery('wfh electrician').locationVariants)
      .toEqual(['wfh', 'remote', 'work from home'])
  })

  it('returns empty for empty/garbage input', () => {
    expect(tokenizeQuery('')).toEqual({ tokens: [], locationVariants: [] })
    expect(tokenizeQuery('   ,,()  ')).toEqual({ tokens: [], locationVariants: [] })
  })
})

describe('locationVariants (location input)', () => {
  it('expands known aliases to the whole group', () => {
    expect(locationVariants('Gurgaon')).toEqual(['gurgaon', 'gurugram'])
    expect(locationVariants('bengaluru')).toEqual(['bangalore', 'bengaluru', 'banglore'])
  })

  it('passes unknown locations through as a single variant', () => {
    expect(locationVariants('Mumbai')).toEqual(['mumbai'])
    expect(locationVariants('Navi Mumbai')).toEqual(['navi mumbai'])
  })

  it('is empty for empty input', () => {
    expect(locationVariants('')).toEqual([])
  })
})

describe('buckets and whitelists', () => {
  it('salary buckets are monthly rupees with open ends', () => {
    expect(SALARY_BUCKETS.under20k).toEqual({ min: 0, max: 20000 })
    expect(SALARY_BUCKETS.over35k).toEqual({ min: 35000, max: null })
  })

  it('experience buckets are months and overlap at edges', () => {
    expect(EXP_BUCKETS.fresher).toEqual({ min: 0, max: 12 })
    expect(EXP_BUCKETS.twoToFive).toEqual({ min: 24, max: 60 })
    expect(EXP_BUCKETS.fivePlus).toEqual({ min: 60, max: null })
  })

  it('posted days and sorts are the documented whitelist', () => {
    expect(POSTED_DAYS).toEqual(['1', '3', '7', '30'])
    expect(SORTS).toEqual(['default', 'newest', 'salary'])
  })
})
