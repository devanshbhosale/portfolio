'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Crown } from 'lucide-react'
import PricingCard, { type PlanCard } from '@/components/PricingCard'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/lib/toast'
import { DEFAULT_PRICES_PAISE, ORIGINAL_PRICES, PLAN_NAMES, PLAN_PERKS, rupees } from '@/lib/plans'
import type { PlanName } from '@/lib/database.types'

interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}
interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill: { email?: string }
  theme: { color: string }
  handler: (response: RazorpayResponse) => void
  modal?: { ondismiss?: () => void }
}
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void }
  }
}

let scriptPromise: Promise<boolean> | null = null
function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.Razorpay) return Promise.resolve(true)
  scriptPromise ??= new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
  return scriptPromise
}

const fallbackPlans = (): PlanCard[] =>
  PLAN_NAMES.map((name) => ({
    name,
    price: rupees(DEFAULT_PRICES_PAISE[name]),
    originalPrice: ORIGINAL_PRICES[name],
    perks: PLAN_PERKS[name],
  }))

export default function PricingPage() {
  const { user, refreshProfile } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [plans, setPlans] = useState<PlanCard[]>(fallbackPlans)
  const [selectedPlan, setSelectedPlan] = useState<PlanName | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { prices?: Record<PlanName, number> } | null) => {
        if (!s?.prices) return
        const prices = s.prices  // const so the closure keeps the narrowing
        setPlans(
          PLAN_NAMES.map((name) => ({
            name,
            price: rupees(prices[name]),
            originalPrice: ORIGINAL_PRICES[name],
            perks: PLAN_PERKS[name],
          })),
        )
      })
      .catch(() => {}) // fallback prices already set
  }, [])

  const pollVerification = useCallback(
    async (paymentId: string, orderId: string): Promise<boolean> => {
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise((r) => setTimeout(r, 3000))
        try {
          const res = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ razorpay_payment_id: paymentId, razorpay_order_id: orderId }),
          })
          if (res.ok) {
            const data = (await res.json()) as { verified?: boolean }
            if (data.verified) return true
          }
        } catch {
          // keep polling
        }
      }
      return false
    },
    [],
  )

  const handleSelect = (name: PlanName) => {
    if (!user) {
      router.push('/login?next=/pricing')
      return
    }
    setSelectedPlan(name)
    setCheckoutOpen(true)
    setError(null)
  }

  const handleCheckout = async () => {
    if (!selectedPlan) return
    if (!user) {
      router.push('/login?next=/pricing')
      return
    }
    setBusy(true)
    setError(null)

    const scriptOk = await loadRazorpayScript()
    if (!scriptOk || !window.Razorpay) {
      setBusy(false)
      setError('Could not load the payment window. Check your connection and retry.')
      return
    }

    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan, referralCode: referralCode.trim() || undefined }),
      })
      const order = (await res.json()) as { id?: string; amount?: number; currency?: string; error?: string }
      if (!res.ok || !order.id || !order.amount) {
        setBusy(false)
        setError(order.error ?? 'Could not start checkout. Try again.')
        return
      }

      const razorpay = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: order.amount,
        currency: order.currency ?? 'INR',
        name: 'Jobkar',
        description: `${selectedPlan} Premium Plan`,
        order_id: order.id,
        prefill: { email: user.email },
        theme: { color: '#2563EB' },
        handler: (response) => {
          setCheckoutOpen(false)
          setBusy(false)
          toast('Payment received — confirming your premium access…')
          pollVerification(response.razorpay_payment_id, response.razorpay_order_id).then((verified) => {
            if (verified) {
              refreshProfile()
              toast(`Premium activated! (${selectedPlan} plan)`)
            } else {
              toast('Payment is processing. Premium activates within a minute or two.', 'error')
            }
          })
        },
        modal: {
          ondismiss: () => {
            setBusy(false)
          },
        },
      })
      razorpay.open()
    } catch {
      setBusy(false)
      setError('Something went wrong starting checkout.')
    }
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-bold text-gray-900">
          Premium Plans
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-3 text-lg text-gray-600">
          Unlock all premium job listings and get direct HR contacts.
        </motion.p>
      </div>

      {user?.premium && user.premiumExpiresAt && (
        <div className="mt-8 mx-auto max-w-2xl flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <Crown className="text-green-600 shrink-0" size={20} aria-hidden />
          <p className="text-sm text-green-900">
            Premium active until <strong>{new Date(user.premiumExpiresAt).toLocaleDateString()}</strong>. Buying again extends from that date — you never lose days.
          </p>
        </div>
      )}

      <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <PricingCard
              plan={plan}
              onSelect={() => handleSelect(plan.name)}
              isSelected={selectedPlan === plan.name}
              busy={busy && selectedPlan === plan.name}
            />
          </motion.div>
        ))}
      </div>

      {checkoutOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Complete your purchase">
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold">Complete Your Purchase</h3>
            <p className="mt-2 text-gray-600">
              Selected plan: <strong>{selectedPlan}</strong> — ₹{plans.find((p) => p.name === selectedPlan)?.price}
            </p>
            <div className="mt-4">
              <label htmlFor="referral" className="block text-sm font-medium text-gray-700">Referral code (optional)</label>
              <input
                id="referral"
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="JK-XXXXXXXX"
              />
            </div>
            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={() => { setCheckoutOpen(false); setBusy(false) }} disabled={busy}>Cancel</Button>
              <Button variant="accent" onClick={handleCheckout} disabled={busy}>
                {busy ? 'Opening checkout…' : 'Pay Now'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
