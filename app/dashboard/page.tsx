'use client'
import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, CheckCircle2, Gift, Wallet, AlertCircle, Banknote, Clock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/lib/toast'
import Button from '@/components/ui/Button'
import BankConnectModal from '@/components/BankConnectModal'
import WithdrawalModal from '@/components/WithdrawalModal'
import { supabase } from '@/lib/supabase'
import { availableCommission, holdingCommission, lifetimeCommission } from '@/lib/money'
import { DEFAULT_WITHDRAW_THRESHOLD } from '@/lib/plans'
import type { PremiumPurchaseRow, WithdrawalRequestRow } from '@/lib/database.types'

const STATUS_STYLES: Record<string, string> = {
  holding: 'bg-amber-100 text-amber-800',
  available: 'bg-green-100 text-green-800',
  withdrawn: 'bg-gray-200 text-gray-700',
  voided: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
}

function statusLabel(p: PremiumPurchaseRow, now: number): string {
  if (p.commission_status === 'pending') {
    return now - new Date(p.created_at).getTime() >= 15 * 60 * 1000 ? 'available' : 'holding'
  }
  return p.commission_status === 'none' ? '—' : p.commission_status
}

export default function ReferralDashboard() {
  const { user, authLoading, refreshProfile } = useAuth()
  const { toast } = useToast()

  const [purchases, setPurchases] = useState<PremiumPurchaseRow[] | null>(null)
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequestRow[]>([])
  const [threshold, setThreshold] = useState(DEFAULT_WITHDRAW_THRESHOLD)
  const [copied, setCopied] = useState(false)
  const [bankModalOpen, setBankModalOpen] = useState(false)
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    const { data: purchasesData } = await supabase
      .from('premium_purchases')
      .select('*')
      .eq('referrer_user_id', user.id)
      .order('created_at', { ascending: false })
    setPurchases((purchasesData as PremiumPurchaseRow[]) ?? [])

    try {
      const res = await fetch('/api/withdrawals')
      if (res.ok) setWithdrawals((await res.json()) as WithdrawalRequestRow[])
    } catch {
      // withdrawals list stays empty on failure; the page still works
    }

    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { withdrawThreshold?: number } | null) => {
        if (s?.withdrawThreshold) setThreshold(s.withdrawThreshold)
      })
      .catch(() => {})
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  if (authLoading) {
    return <div className="py-16 text-center text-gray-500">Loading…</div>
  }
  if (!user) {
    return <div className="py-16 text-center">Please log in to view your dashboard.</div>
  }

  const now = Date.now()
  const rows = purchases ?? []
  const available = availableCommission(rows, now)
  const holding = holdingCommission(rows, now)
  const lifetime = lifetimeCommission(rows)
  const pendingWithdrawTotal = withdrawals
    .filter((w) => w.status === 'pending')
    .reduce((s, w) => s + w.amount, 0)
  const withdrawable = Math.max(0, available - pendingWithdrawTotal)
  const canWithdraw = withdrawable >= threshold && user.bankConnected
  const maskedAccount = user.bankConnected ? `•••• ${'0000'}` : null

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(user.referralCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Could not copy — long-press to select the code', 'error')
    }
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900">Your Referral Dashboard</h1>
      <p className="mt-2 text-gray-600">Earn 20%+ commission on every premium plan purchased with your code.</p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Your Unique Referral Code</h2>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl font-mono font-bold text-primary-600">{user.referralCode}</span>
              <button
                onClick={copyCode}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                title="Copy code"
                aria-label="Copy referral code"
              >
                {copied ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />}
              </button>
            </div>
          </div>
          <Gift size={32} className="text-accent-500" aria-hidden />
        </div>
        <p className="mt-3 text-sm text-gray-500">Share this code with friends. When they buy a premium plan, your commission is credited automatically (releasable after 15 minutes).</p>
      </motion.div>

      <div className="mt-6 grid md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500"><Wallet size={18} aria-hidden /><span>Available to withdraw</span></div>
          <p className="mt-2 text-3xl font-bold text-gray-900">₹{withdrawable.toFixed(2)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500"><Clock size={18} aria-hidden /><span>In holding (15 min)</span></div>
          <p className="mt-2 text-3xl font-bold text-gray-900">₹{holding.toFixed(2)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500"><Banknote size={18} aria-hidden /><span>Lifetime earnings</span></div>
          <p className="mt-2 text-3xl font-bold text-gray-900">₹{lifetime.toFixed(2)}</p>
        </motion.div>
      </div>

      <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Referral History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((p) => {
                const label = statusLabel(p, now)
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">{p.plan}</td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600">+₹{p.commission_amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[label] ?? 'bg-gray-100 text-gray-600'}`}>{label}</span>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">No referrals yet. Share your code!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800">Withdraw Earnings</h2>
        {!user.bankConnected ? (
          <div className="mt-4 flex items-start gap-3 p-4 bg-amber-50 rounded-lg">
            <AlertCircle className="text-amber-500 mt-0.5 shrink-0" size={18} aria-hidden />
            <div>
              <p className="text-sm">Connect your bank account to withdraw earnings.</p>
              <Button size="sm" className="mt-2" onClick={() => setBankModalOpen(true)}>Connect Bank Account</Button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-gray-600">Bank connected{maskedAccount ? `: ${maskedAccount}` : ''} ({user.email})</p>
            {canWithdraw ? (
              <Button className="mt-3" onClick={() => setWithdrawModalOpen(true)}>Request Withdrawal</Button>
            ) : (
              <p className="mt-3 text-sm text-red-600">
                You need at least ₹{threshold} available to withdraw. Current available balance: ₹{withdrawable.toFixed(2)}.
              </p>
            )}
          </div>
        )}

        {withdrawals.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700">Withdrawal Requests</h3>
            <ul className="mt-2 space-y-2">
              {withdrawals.map((w) => (
                <li key={w.id} className="flex justify-between text-sm py-2 border-b border-gray-100">
                  <span>₹{w.amount.toFixed(2)} · {new Date(w.created_at).toLocaleDateString()}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[w.status] ?? 'bg-gray-100 text-gray-600'}`}>{w.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <BankConnectModal
        isOpen={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        onSuccess={() => refreshProfile()}
      />
      <WithdrawalModal
        isOpen={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        maxAmount={withdrawable}
        threshold={threshold}
        onSuccess={() => load()}
      />
    </div>
  )
}
