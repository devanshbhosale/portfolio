'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown, ArrowRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  const router = useRouter()

  const goToPricing = () => {
    onClose()
    router.push('/pricing')
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
            initial={{ scale: 0.8, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <Crown size={28} className="text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Unlock Premium Jobs</h3>
              <p className="mt-2 text-gray-600">
                This job listing is exclusive to premium members. Upgrade for the direct HR contact, one-tap apply, and the full listing details.
              </p>
              <div className="mt-6 space-y-3">
                <Button fullWidth variant="accent" size="lg" onClick={goToPricing}>
                  View Premium Plans <ArrowRight size={16} className="ml-2" />
                </Button>
                <button
                  onClick={onClose}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
