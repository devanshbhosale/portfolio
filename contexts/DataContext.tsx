'use client'
import { createContext, useContext, useState, ReactNode } from 'react'
import { mockJobs, Job } from '@/data/jobs'
import { mockUsers, ReferralRecord } from '@/data/referrals'

export interface WithdrawalRequest {
  id: string
  userId: string
  amount: number
  bankAccount: string
  status: 'pending' | 'approved'
  requestedAt: Date
}

interface DataContextType {
  jobs: Job[]
  setJobs: (jobs: Job[]) => void
  referrals: ReferralRecord[]
  addReferral: (record: ReferralRecord) => void
  withdrawals: WithdrawalRequest[]
  addWithdrawalRequest: (request: WithdrawalRequest) => void
  approveWithdrawal: (id: string) => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>(mockJobs)
  const [referrals, setReferrals] = useState<ReferralRecord[]>(mockUsers[0].referrals)
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])

  const addReferral = (record: ReferralRecord) => setReferrals(prev => [...prev, record])
  const addWithdrawalRequest = (request: WithdrawalRequest) => setWithdrawals(prev => [...prev, request])
  const approveWithdrawal = (id: string) => {
    setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: 'approved' } : w))
  }

  return (
    <DataContext.Provider value={{
      jobs, setJobs,
      referrals, addReferral,
      withdrawals, addWithdrawalRequest, approveWithdrawal
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used within DataProvider')
  return context
}
