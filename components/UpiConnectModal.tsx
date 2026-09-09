'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Smartphone } from 'lucide-react'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import { upiConnectSchema } from '@/lib/validation'

interface UpiConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function UpiConnectModal({ isOpen, onClose, onSuccess }: UpiConnectModalProps) {
  const { toast } = useToast()
  const [upiId, setUpiId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSave = async () => {
    // UPI IDs are case-insensitive; normalize before validation + storage.
    const parsed = upiConnectSchema.safeParse({ upiId: upiId.trim().toLowerCase() })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    setError(null)
    setBusy(true)
    const { error } = await supabase.rpc('set_own_upi', { p_upi: parsed.data.upiId })
    setBusy(false)
    if (error) {
      toast('Could not save your UPI ID. Try again.', 'error')
      return
    }
    toast('UPI ID saved')
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
          aria-label="Add UPI ID"
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
                <Smartphone size={24} className="text-primary-600" aria-hidden />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Add UPI ID</h3>
              <p className="text-sm text-gray-500 mt-1">Get referral payouts sent straight to your UPI ID.</p>
              <p className="mt-1 text-xs text-gray-500">
                Used only to send your payouts — never shared.{' '}
                <Link href="/privacy" className="underline hover:text-primary-600">Privacy Policy</Link>
              </p>
            </div>
            <div>
              <label htmlFor="upi-id" className="block text-sm font-medium text-gray-700">UPI ID</label>
              <input
                id="upi-id"
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                placeholder="yourname@upi"
                autoComplete="off"
              />
              {error && <p role="alert" className="mt-1 text-sm text-red-600">{error}</p>}
            </div>
            <Button fullWidth variant="primary" className="mt-6" onClick={handleSave} disabled={busy}>
              {busy ? 'Saving…' : 'Save UPI ID'}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
