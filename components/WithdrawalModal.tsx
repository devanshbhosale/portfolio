'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wallet } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useToast } from '@/lib/toast'

interface WithdrawalModalProps {
  isOpen: boolean
  onClose: () => void
  maxAmount: number       // rupees the user can withdraw right now
  threshold: number       // minimum withdrawal
  onSuccess: () => void
}

export default function WithdrawalModal({ isOpen, onClose, maxAmount, threshold, onSuccess }: WithdrawalModalProps) {
  const { toast } = useToast()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleRequest = async () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid amount')
      return
    }
    if (value < threshold) {
      setError(`Minimum withdrawal is ₹${threshold}`)
      return
    }
    if (value > maxAmount) {
      setError(`You can withdraw up to ₹${maxAmount.toFixed(2)}`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: value }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Could not submit request')
        return
      }
      toast('Withdrawal request submitted — you will see the status below once approved.')
      onSuccess()
      onClose()
      setAmount('')
    } catch {
      setError('Network error. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Request withdrawal"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" aria-label="Close">
              <X size={20} />
            </button>
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 bg-accent-50 rounded-full flex items-center justify-center mb-3">
                <Wallet size={24} className="text-accent-500" aria-hidden />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Request Withdrawal</h3>
              <p className="text-sm text-gray-500 mt-1">
                Available: ₹{maxAmount.toFixed(2)} · Minimum: ₹{threshold}
              </p>
            </div>
            <div>
              <label htmlFor="withdraw-amount" className="block text-sm font-medium text-gray-700">Amount (₹)</label>
              <input
                id="withdraw-amount"
                type="number"
                inputMode="decimal"
                min={threshold}
                max={Math.floor(maxAmount * 100) / 100}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder={`Between ₹${threshold} and ₹${Math.floor(maxAmount)}`}
              />
              {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
            <Button fullWidth variant="accent" className="mt-6" onClick={handleRequest} disabled={busy}>
              {busy ? 'Submitting…' : 'Submit Request'}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
