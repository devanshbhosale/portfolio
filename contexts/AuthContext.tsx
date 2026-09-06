'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { hydrateMarks } from '@/lib/jobMarks'
import type { ProfileRow, UserRole } from '@/lib/database.types'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  referralCode: string
  premium: boolean
  premiumExpiresAt: string | null
  bankConnected: boolean
  bankLast4: string | null
}

interface AuthResult {
  error: string | null
}

interface SignUpResult extends AuthResult {
  needsConfirmation: boolean
}

interface AuthContextType {
  user: AuthUser | null
  authLoading: boolean
  login: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string, fullName: string, termsAccepted: boolean) => Promise<SignUpResult>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/** What the browser fetches of a profile — the safe-column subset (must stay
 *  a subset of the column-level SELECT grant; raw bank_* are never fetched). */
type SafeProfileRow = Pick<
  ProfileRow,
  'id' | 'email' | 'full_name' | 'role' | 'referral_code' | 'premium_plan' | 'premium_expires_at' | 'bank_connected_at' | 'bank_last4' | 'pan_number' | 'terms_accepted_at' | 'created_at'
>

function toAuthUser(session: Session, profile: SafeProfileRow): AuthUser {
  return {
    id: session.user.id,
    name: profile.full_name || profile.email.split('@')[0],
    email: profile.email,
    role: profile.role,
    referralCode: profile.referral_code,
    premium: profile.premium_expires_at
      ? new Date(profile.premium_expires_at).getTime() > Date.now()
      : false,
    premiumExpiresAt: profile.premium_expires_at,
    bankConnected: Boolean(profile.bank_connected_at && profile.bank_last4),
    bankLast4: profile.bank_last4 ?? null,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const mounted = useRef(true)

  const fetchProfile = useCallback(async (session: Session) => {
    // Retry once: the signup trigger can land a beat after the first login.
    for (let attempt = 0; attempt < 2; attempt++) {
      // Explicit safe columns — raw bank_* columns are never fetched into a
      // browser (and after the column grants land, they are not even readable).
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, referral_code, premium_plan, premium_expires_at, bank_connected_at, bank_last4, pan_number, terms_accepted_at, created_at')
        .eq('id', session.user.id)
        .single()
      if (!error && profile) {
        if (mounted.current) setUser(toAuthUser(session, profile))
        // Merge this device's saved/applied marks into the account (union;
        // account becomes source of truth). Fire-and-forget — guests keep
        // localStorage-only memory and never hit this path.
        hydrateMarks(session.user.id).catch(() => {})
        return
      }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 500))
    }
    if (mounted.current) {
      setUser(null)
      setAuthLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Keep the callback sync (Supabase recommendation); do async work here.
      if (session) {
        fetchProfile(session).finally(() => {
          if (mounted.current) setAuthLoading(false)
        })
      } else {
        if (mounted.current) {
          setUser(null)
          setAuthLoading(false)
        }
      }
    })

    return () => {
      mounted.current = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName: string, termsAccepted: boolean): Promise<SignUpResult> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // handle_new_user trigger reads both: profile name + the 18+/terms
      // checkbox tick, which becomes profiles.terms_accepted_at.
      options: { data: { full_name: fullName, terms_accepted: termsAccepted } },
    })
    return {
      error: error?.message ?? null,
      needsConfirmation: !error && !data.session,
    }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) await fetchProfile(session)
  }, [fetchProfile])

  return (
    <AuthContext.Provider value={{ user, authLoading, login, signUp, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
