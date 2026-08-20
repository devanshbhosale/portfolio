'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
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
  signUp: (email: string, password: string, fullName: string) => Promise<SignUpResult>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function toAuthUser(session: Session, profile: ProfileRow): AuthUser {
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
    bankConnected: Boolean(profile.bank_connected_at && profile.bank_account_number),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const mounted = useRef(true)

  const fetchProfile = useCallback(async (session: Session) => {
    // Retry once: the signup trigger can land a beat after the first login.
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      if (!error && profile) {
        if (mounted.current) setUser(toAuthUser(session, profile))
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

  const signUp = useCallback(async (email: string, password: string, fullName: string): Promise<SignUpResult> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }, // handle_new_user trigger reads this
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
