import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// toAuthUser lives in a 'use client' JSX module that vitest (node env, no
// JSX transform) cannot import — so the mapper invariant is enforced against
// the source itself: the mapping must derive bankConnected from bank_last4
// and never from bank_account_number, and the AuthUser shape carries
// bankLast4. The select-list/grant-set equality is asserted literally.

const SAFE_COLUMNS = [
  'id', 'email', 'full_name', 'role', 'referral_code', 'premium_plan',
  'premium_expires_at', 'bank_connected_at', 'bank_last4', 'upi_id', 'pan_number',
  'terms_accepted_at', 'created_at',
] as const

const authSrc = () => readFileSync(resolve('contexts/AuthContext.tsx'), 'utf8')

describe('profiles browser-safe column set', () => {
  it('contains every column AuthContext selects (grants must match code)', () => {
    const m = authSrc().match(/\.select\('([^']+)'\)/)
    expect(m).not.toBeNull()
    const selected = m![1].split(',').map((s) => s.trim())
    expect(selected.sort()).toEqual([...SAFE_COLUMNS].sort())
  })

  it('never includes the raw bank columns', () => {
    const raw = ['bank_holder_name', 'bank_account_number', 'bank_ifsc']
    for (const col of raw) {
      expect(SAFE_COLUMNS).not.toContain(col as never)
    }
  })

  it('toAuthUser derives bankConnected from bank_last4 (source-invariant)', () => {
    const src = authSrc()
    expect(src).toContain('bankConnected: Boolean(profile.bank_connected_at && profile.bank_last4)')
    expect(src).toContain('bankLast4: profile.bank_last4 ?? null')
    // The mapper must not read the raw number anywhere.
    expect(src).not.toContain('profile.bank_account_number')
  })

  it('toAuthUser carries upiId (source-invariant)', () => {
    const src = authSrc()
    expect(src).toContain('upiId: profile.upi_id ?? null')
  })

  it('withdrawal history exposes no bank number or UPI to the browser', () => {
    const src = readFileSync(resolve('app/api/withdrawals/route.ts'), 'utf8')
    expect(src).not.toMatch(/select\('\*'\)/)
    expect(src).not.toContain('bank_account_number')
    expect(src).not.toMatch(/upi_id/)
  })

  it('the public settings response strips mrps — invented prices are never served', () => {
    const src = readFileSync(resolve('app/api/settings/route.ts'), 'utf8')
    expect(src).toMatch(/mrps/)
    expect(src).toMatch(/void mrps/)
    expect(src).toMatch(/NextResponse\.json\(publicSettings\)/)
  })
})
