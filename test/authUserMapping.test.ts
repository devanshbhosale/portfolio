import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// toAuthUser lives in a 'use client' JSX module that vitest (node env, no
// JSX transform) cannot import — so the mapper invariant is enforced against
// the source itself: the browser only ever selects and maps the four
// identity columns. Payment/bank/upi columns must never come back even
// though the DB column grants still allow them (harmless superset since the
// site went ad-supported, 2026-10-24).

const SAFE_COLUMNS = ['id', 'email', 'full_name', 'role'] as const

const authSrc = () => readFileSync(resolve('contexts/AuthContext.tsx'), 'utf8')

describe('profiles browser-safe column set', () => {
  it('contains every column AuthContext selects (grants must match code)', () => {
    const m = authSrc().match(/\.select\('([^']+)'\)/)
    expect(m).not.toBeNull()
    const selected = m![1].split(',').map((s) => s.trim())
    expect(selected.sort()).toEqual([...SAFE_COLUMNS].sort())
  })

  it('never selects the raw bank or payment columns', () => {
    const src = authSrc()
    for (const col of [
      'bank_holder_name', 'bank_account_number', 'bank_ifsc', 'bank_last4',
      'pan_number', 'upi_id', 'referral_code', 'premium_plan', 'premium_expires_at',
    ]) {
      expect(src).not.toMatch(new RegExp(`\\.select\\('[^']*\\b${col}\\b`))
    }
  })
})
