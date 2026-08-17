'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Landmark } from 'lucide-react'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import { accountNumberSchema, ifscSchema } from '@/lib/validation'

interface BankConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function BankConnectModal({ isOpen, onClose, onSuccess }: BankConnectModalProps) {
  const { toast } = useToast()
  const [holderName, setHolderName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [errors, setErrors] = useState<{ holder?: string; account?: string; ifsc?: string }>({})
  const [busy, setBusy] = useState(false)

  const handleConnect = async () => {
    const next: typeof errors = {}
    if (holderName.trim().length < 2) next.holder = 'Enter the account holder name'
    const account = accountNumberSchema.safeParse(accountNumber.trim())
    if (!account.success) next.account = 'Account number must be 9-18 digits'
    const ifscCheck = ifscSchema.safeParse(ifsc.trim().toUpperCase())
    if (!ifscCheck.success) next.ifsc = 'IFSC must look like HDFC0001234'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setBusy(true)
    const { error } = await supabase.rpc('update_own_profile', {
      p_holder: holderName.trim(),
      p_account: accountNumber.trim(),
      p_ifsc: ifsc.trim().toUpperCase(),
    })
    setBusy(false)

    if (error) {
      toast('Could not save bank details. Try again.', 'error')
      return
    }
    toast('Bank account connected')
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
          role="dialog"
          aria-modal="true"
          aria-label="Connect bank account"
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
              <div className="mx-auto w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mb-3">
                <Landmark size={24} className="text-primary-600" aria-hidden />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Connect Bank Account</h3>
              <p className="text-sm text-gray-500 mt-1">Enter your bank details for withdrawals.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="bank-holder" className="block text-sm font-medium text-gray-700">Account holder name</label>
                <input
                  id="bank-holder"
                  type="text"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Full name as per bank records"
                  autoComplete="name"
                />
                {errors.holder && <p role="alert" className="mt-1 text-sm text-red-600">{errors.holder}</p>}
              </div>
              <div>
                <label htmlFor="bank-account" className="block text-sm font-medium text-gray-700">Account number</label>
                <input
                  id="bank-account"
                  type="text"
                  inputMode="numeric"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="9-18 digits"
                  autoComplete="off"
                />
                {errors.account && <p role="alert" className="mt-1 text-sm text-red-600">{errors.account}</p>}
              </div>
              <div>
                <label htmlFor="bank-ifsc" className="block text-sm font-medium text-gray-700">IFSC code</label>
                <input
                  id="bank-ifsc"
                  type="text"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                  placeholder="HDFC0001234"
                  autoComplete="off"
                />
                {errors.ifsc && <p role="alert" className="mt-1 text-sm text-red-600">{errors.ifsc}</p>}
              </div>
            </div>
            <Button fullWidth variant="primary" className="mt-6" onClick={handleConnect} disabled={busy}>
              {busy ? 'Saving…' : 'Connect Bank'}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
