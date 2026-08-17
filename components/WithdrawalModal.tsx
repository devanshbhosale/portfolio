'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wallet } from 'lucide-react'
import Button from '@/components/ui/Button'

interface WithdrawalModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function WithdrawalModal({ isOpen, onClose }: WithdrawalModalProps) {
  const [amount, setAmount] = useState('')

  const handleRequest = () => {
    // Simulate withdrawal request
    onClose()
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
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 bg-accent-50 rounded-full flex items-center justify-center mb-3">
                <Wallet size={24} className="text-accent-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Request Withdrawal</h3>
              <p className="text-sm text-gray-500 mt-1">Enter the amount you wish to withdraw.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Min ₹500"
              />
            </div>
            <Button fullWidth variant="accent" className="mt-6" onClick={handleRequest}>
              Submit Request
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
