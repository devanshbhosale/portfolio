'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

interface PremiumContextType {
  isPremium: boolean
  setPremium: (value: boolean) => void
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined)

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setPremium] = useState(false)
  return (
    <PremiumContext.Provider value={{ isPremium, setPremium }}>
      {children}
    </PremiumContext.Provider>
  )
}

export function usePremium() {
  const context = useContext(PremiumContext)
  if (!context) throw new Error('usePremium must be used within PremiumProvider')
  return context
}
