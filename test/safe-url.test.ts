import { describe, it, expect } from 'vitest'
import { safeExternalUrl } from '@/lib/safe-url'

describe('safeExternalUrl — href allowlist for scraped/DB content', () => {
  it('passes http and https through, canonicalized via URL.href', () => {
    expect(safeExternalUrl('https://example.com/apply')).toBe('https://example.com/apply')
    expect(safeExternalUrl('http://example.com')).toBe('http://example.com/')
    expect(safeExternalUrl('https://EXAMPLE.COM/Path?q=1')).toBe('https://example.com/Path?q=1')
  })

  it('rejects javascript:, data:, vbscript: and file: schemes', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull()
    expect(safeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(safeExternalUrl('vbscript:msgbox(1)')).toBeNull()
    expect(safeExternalUrl('file:///c:/windows/system32')).toBeNull()
  })

  it('rejects empty, null-ish and unparseable values', () => {
    expect(safeExternalUrl('')).toBeNull()
    expect(safeExternalUrl(null)).toBeNull()
    expect(safeExternalUrl(undefined)).toBeNull()
    expect(safeExternalUrl('not a url')).toBeNull()
  })

  it('rejects scheme-relative protocol tricks', () => {
    // Without a base, new URL('//evil.com') throws → null.
    expect(safeExternalUrl('//evil.com/apply')).toBeNull()
    expect(safeExternalUrl('//example.com/')).toBeNull()
  })
})
