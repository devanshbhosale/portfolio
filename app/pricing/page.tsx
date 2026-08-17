'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import PricingCard from '@/components/PricingCard'
import Button from '@/components/ui/Button'
import { usePremium } from '@/contexts/PremiumContext'
import { useAuth } from '@/contexts/AuthContext'

const plans = [
  { duration: 'Weekly', price: 99, originalPrice: 199, perks: ['All premium job listings', 'Direct HR contacts', 'Priority support'] },
  { duration: 'Monthly', price: 199, originalPrice: 399, perks: ['All premium job listings', 'Direct HR contacts', 'Referral bonus boost', 'Weekly job alerts'] },
  { duration: 'Quarterly', price: 499, originalPrice: 999, perks: ['All monthly perks', 'Save 50%', 'Resume review', 'Featured profile'] },
  { duration: 'Annual', price: 1499, originalPrice: 2999, perks: ['All quarterly perks', 'Save 60%', 'Dedicated career coach', 'Early access to new jobs'] },
]

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const { setPremium } = usePremium()
  const { user, upgradeToPremium } = useAuth()

  const handleSelect = (duration: string) => {
    setSelectedPlan(duration)
    setCheckoutOpen(true)
  }

  const handleCheckout = () => {
    setPremium(true)
    if (user) upgradeToPremium()
    setCheckoutOpen(false)
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-bold text-gray-900">
          Premium Plans
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-3 text-lg text-gray-600">
          Unlock all premium job listings and get direct HR referrals.
        </motion.p>
      </div>

      <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.duration}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <PricingCard
              plan={plan}
              onSelect={() => handleSelect(plan.duration)}
              isSelected={selectedPlan === plan.duration}
            />
          </motion.div>
        ))}
      </div>

      {checkoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold">Complete Your Purchase</h3>
            <p className="mt-2 text-gray-600">Selected plan: {selectedPlan}</p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Referral Code (optional)</label>
              <input
                type="text"
                value={referralCode}
                onChange={e => setReferralCode(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter code to give 20% commission"
              />
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
              <Button variant="accent" onClick={handleCheckout}>Pay Now</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
