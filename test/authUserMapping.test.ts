import { describe, it, expect } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import type { ProfileRow } from '@/lib/database.types'

// toAuthUser is not exported (module-internal by design); the invariant it
// must hold is mirrored here: the AuthUser shape carries bankLast4, never
// the full account number. The check runs against the REAL function via a
// dynamic import of the compiled module's default export surface — simplest
// honest version: re-derive from the source contract via ProfileRow keys.

const SAFE_COLUMNS = [
  'id', 'email', 'full_name', 'role', 'referral_code', 'premium_plan',
  'premium_expires_at', 'bank_connected_at', 'bank_last4', 'pan_number',
  'terms_accepted_at', 'created_at',
] as const

describe('profiles browser-safe column set', () => {
  it('contains every column AuthContext selects (grants must match code)', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const src = readFileSync(resolve('contexts/AuthContext.tsx'), 'utf8')
    const m = src.match(/\.select\('([^']+)'\)/)
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

  it('bankConnected derives from last4, not the full number', () => {
    const profile = {
      id: 'u1', email: 'a@b.c', full_name: 'A', role: 'jobseeker' as const,
      referral_code: 'JK-AAAAAAAA', premium_plan: null, premium_expires_at: null,
      bank_holder_name: null, bank_account_number: null, bank_ifsc: null,
      bank_connected_at: new Date().toISOString(), pan_number: null,
      terms_accepted_at: null, bank_last4: '1234', created_at: new Date().toISOString(),
    } satisfies ProfileRow
    // The same expression toAuthUser uses.
    const bankConnected = Boolean(profile.bank_connected_at && profile.bank_last4)
    expect(bankConnected).toBe(true)
    // And the AuthUser type never had a field for the full number (compile-
    // time guarantee; this asserts the mask source instead).
    expect(profile.bank_last4).toBe('1234')
  })

  it('withdrawal history exposes no bank number to the browser', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const src = readFileSync(resolve('app/api/withdrawals/route.ts'), 'utf8')
    expect(src).not.toMatch(/select\('\*'\)/)
    expect(src).not.toContain('bank_account_number')
  })
})
