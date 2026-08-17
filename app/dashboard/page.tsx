'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, CheckCircle2, Gift, Wallet, AlertCircle, Banknote, ArrowUpRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import Button from '@/components/ui/Button'
import BankConnectModal from '@/components/BankConnectModal'
import WithdrawalModal from '@/components/WithdrawalModal'

export default function ReferralDashboard() {
  const { user } = useAuth()
  const { referrals, withdrawals } = useData()
  const [copied, setCopied] = useState(false)
  const [bankModalOpen, setBankModalOpen] = useState(false)
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [bankConnected, setBankConnected] = useState(false)

  if (!user) {
    return <div className="py-16 text-center">Please login to view your dashboard.</div>
  }

  const totalEarnings = referrals.filter(r => r.referrerId === user.id).reduce((sum, r) => sum + r.commission, 0)
  const canWithdraw = totalEarnings >= 500 && bankConnected

  const copyCode = () => {
    navigator.clipboard.writeText(user.referralCode || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900">Your Referral Dashboard</h1>
      <p className="mt-2 text-gray-600">Earn 20% commission on every premium plan purchased with your code.</p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Your Unique Referral Code</h2>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl font-mono font-bold text-primary-600">{user.referralCode}</span>
              <button
                onClick={copyCode}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                title="Copy code"
              >
                {copied ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />}
              </button>
            </div>
          </div>
          <Gift size={32} className="text-accent-500" />
        </div>
        <p className="mt-3 text-sm text-gray-500">Share this code with friends. When they buy a premium plan, you get 20% automatically.</p>
      </motion.div>

      <div className="mt-6 grid md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <Wallet size={18} />
            <span>Total Earnings</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">₹{totalEarnings.toFixed(2)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <Banknote size={18} />
            <span>Withdrawal Threshold</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">₹500</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <ArrowUpRight size={18} />
            <span>Next Payout</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalEarnings >= 500 ? 'Ready' : 'Locked'}</p>
        </motion.div>
      </div>

      <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Referral History</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan Purchased</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {referrals.filter(r => r.referrerId === user.id).map(ref => (
              <tr key={ref.id}>
                <td className="px-4 py-3 text-sm">{ref.date.toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm">{ref.plan}</td>
                <td className="px-4 py-3 text-sm font-medium text-green-600">+₹{ref.commission.toFixed(2)}</td>
              </tr>
            ))}
            {referrals.filter(r => r.referrerId === user.id).length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-500">No referrals yet. Share your code!</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800">Withdraw Earnings</h2>
        {!bankConnected ? (
          <div className="mt-4 flex items-start gap-3 p-4 bg-amber-50 rounded-lg">
            <AlertCircle className="text-amber-500 mt-0.5" size={18} />
            <div>
              <p className="text-sm">Connect your bank account to withdraw earnings.</p>
              <Button size="sm" className="mt-2" onClick={() => setBankModalOpen(true)}>Connect Bank Account</Button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-gray-600">Bank connected: **1234 (HDFC)</p>
            {canWithdraw ? (
              <Button className="mt-3" onClick={() => setWithdrawModalOpen(true)}>Request Withdrawal</Button>
            ) : (
              <p className="mt-3 text-sm text-red-600">
                You need at least ₹500 to withdraw. Current balance: ₹{totalEarnings.toFixed(2)}.
              </p>
            )}
          </div>
        )}

        {withdrawals.some(w => w.userId === user.id) && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700">Withdrawal Requests</h3>
            <ul className="mt-2 space-y-2">
              {withdrawals.filter(w => w.userId === user.id).map(w => (
                <li key={w.id} className="flex justify-between text-sm py-2 border-b border-gray-100">
                  <span>₹{w.amount} - {w.status}</span>
                  <span className={w.status === 'approved' ? 'text-green-600' : 'text-amber-600'}>{w.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <BankConnectModal isOpen={bankModalOpen} onClose={() => setBankModalOpen(false)} onSuccess={() => setBankConnected(true)} />
      <WithdrawalModal isOpen={withdrawModalOpen} onClose={() => setWithdrawModalOpen(false)} />
    </div>
  )
}
