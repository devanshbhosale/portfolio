import { describe, it, expect } from 'vitest'
import { AD_MIN_HEIGHTS, AD_SLOTS, isValidAdsenseClient } from '@/lib/ads'

describe('isValidAdsenseClient', () => {
  it('accepts only well-formed publisher ids', () => {
    expect(isValidAdsenseClient('ca-pub-1234567890123456')).toBe(true)
    expect(isValidAdsenseClient(undefined)).toBe(false)
    expect(isValidAdsenseClient('')).toBe(false)
    expect(isValidAdsenseClient('pub-1234567890123456')).toBe(false)
    expect(isValidAdsenseClient('ca-pub-123')).toBe(false)
  })
})

describe('ad slot inventory', () => {
  it('reserves a height for every slot so ads can never shift layout', () => {
    for (const key of Object.keys(AD_SLOTS) as (keyof typeof AD_SLOTS)[]) {
      expect(AD_MIN_HEIGHTS[key]).toBeGreaterThan(0)
    }
  })

  it('has a min-height entry for exactly the declared slots', () => {
    expect(Object.keys(AD_MIN_HEIGHTS).sort()).toEqual(Object.keys(AD_SLOTS).sort())
  })
})
