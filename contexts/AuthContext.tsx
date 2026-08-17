'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

type UserRole = 'jobseeker' | 'agent' | 'admin' | null
type User = {
  id: string
  name: string
  email: string
  role: UserRole
  referralCode?: string
  premium?: boolean
}

interface AuthContextType {
  user: User | null
  login: (role: UserRole, email?: string) => void
  logout: () => void
  upgradeToPremium: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = (role: UserRole, email = 'demo@jobkar.in') => {
    const id = Math.random().toString(36).substring(2, 10)
    const referralCode = `JK-${id.toUpperCase()}`
    setUser({ id, name: email.split('@')[0], email, role, referralCode, premium: false })
  }

  const logout = () => setUser(null)

  const upgradeToPremium = () => {
    setUser(prev => prev ? { ...prev, premium: true } : prev)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, upgradeToPremium }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
