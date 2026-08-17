'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Landmark } from 'lucide-react'
import Button from '@/components/ui/Button'

interface BankConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function BankConnectModal({ isOpen, onClose, onSuccess }: BankConnectModalProps) {
  const [accountNumber, setAccountNumber] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [holderName, setHolderName] = useState('')

  const handleConnect = () => {
    // Simulate bank connection
    onSuccess()
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
              <div className="mx-auto w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mb-3">
                <Landmark size={24} className="text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Connect Bank Account</h3>
              <p className="text-sm text-gray-500 mt-1">Enter your bank details for withdrawals.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Account Holder Name</label>
                <input
                  type="text"
                  value={holderName}
                  onChange={e => setHolderName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Full name as per bank records"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter account number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                <input
                  type="text"
                  value={ifsc}
                  onChange={e => setIfsc(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. HDFC0001234"
                />
              </div>
            </div>
            <Button fullWidth variant="primary" className="mt-6" onClick={handleConnect}>
              Connect Bank
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
