'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Check, Crown, ShieldCheck, RefreshCcw, Zap } from 'lucide-react'
import PricingCard, { type PlanCard } from '@/components/PricingCard'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/lib/toast'
import { PLAN_NAMES, SHARED_FEATURES } from '@/lib/plans'
import type { PlanName } from '@/lib/database.types'

const BADGES: Partial<Record<PlanName, string>> = {
  Monthly: 'Most Popular',
  Lifetime: 'Best Value',
}
const HIGHLIGHTED: PlanName = 'Monthly'

const TRUST_POINTS = [
  { icon: ShieldCheck, text: 'Free to browse' },
  { icon: RefreshCcw, text: 'Cancel anytime' },
  { icon: Zap, text: 'Instant activation' },
]

export default function PricingPlans({
  plans,
  stats,
  activePremiumUntil,
}: {
  plans: PlanCard[]
  stats: { activeJobs: number; premiumJobs: number; freshJobs: number }
  activePremiumUntil: string | null
}) {
  const { user, refreshProfile } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [selectedPlan, setSelectedPlan] = useState<PlanName | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pollingPaymentId, setPollingPaymentId] = useState<string | null>(null)

  // Dodo redirects back to /pricing?payment_id=…&status=… after checkout.
  // Poll verify-payment until the webhook lands (≤30s), then refresh.
  useEffect(() => {
    const paymentId = searchParams.get('payment_id')
    if (!paymentId || !user || pollingPaymentId === paymentId) return
    setPollingPaymentId(paymentId)
    toast('Payment received. Confirming your premium access…')
    router.replace('/pricing', { scroll: false })
    ;(async () => {
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise((r) => setTimeout(r, 3000))
        try {
          const res = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_id: paymentId }),
          })
          if (res.ok) {
            const data = (await res.json()) as { verified?: boolean }
            if (data.verified) {
              refreshProfile()
              toast('Premium activated!')
              setPollingPaymentId(null)
              return
            }
          }
        } catch {
          // keep polling
        }
      }
      toast('Payment is processing. Premium activates within a few minutes. If it does not, contact jobkarbe@gmail.com', 'error')
      setPollingPaymentId(null)
    })()
  }, [searchParams, user, pollingPaymentId, toast, refreshProfile, router])

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

    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan, referralCode: referralCode.trim() || undefined }),
      })
      const session = (await res.json()) as { checkout_url?: string; error?: string }
      if (!res.ok || !session.checkout_url) {
        setBusy(false)
        setError(session.error ?? 'Could not start checkout. Try again.')
        return
      }
      // Hosted checkout: hand the customer to Dodo. They come back to
      // /pricing?payment_id=…, where the poll effect above takes over.
      window.location.assign(session.checkout_url)
    } catch {
      setBusy(false)
      setError('Something went wrong starting checkout.')
    }
  }

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="bg-navy-50">
        <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-extrabold font-display text-navy-700"
          >
            Stop applying blindly.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 mx-auto max-w-2xl text-lg text-gray-600"
          >
            Upgrade once and unlock every premium listing: hidden jobs, salary details where employers share them, and direct apply links.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-5 text-sm font-medium text-navy-500"
          >
            {stats.activeJobs.toLocaleString('en-IN')}+ active jobs ·{' '}
            {stats.premiumJobs.toLocaleString('en-IN')} premium listings ·{' '}
            {stats.freshJobs.toLocaleString('en-IN')} new this week
          </motion.p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {TRUST_POINTS.map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <Icon size={18} className="text-success" aria-hidden /> {text}
              </span>
            ))}
          </div>

          {activePremiumUntil && (
            <div className="mt-8 mx-auto max-w-2xl flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-left">
              <Crown className="text-green-600 shrink-0" size={20} aria-hidden />
              <p className="text-sm text-green-900">
                Premium active until <strong>{new Date(activePremiumUntil).toLocaleDateString()}</strong>. Buying
                again extends from that date, so you never lose days.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Cards */}
      <section className="mt-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid gap-8 md:grid-cols-3 lg:gap-6 lg:items-center">
          {PLAN_NAMES.map((name, i) => {
            const card = plans.find((p) => p.name === name)!
            return (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <PricingCard
                  plan={card}
                  badge={BADGES[name]}
                  highlighted={name === HIGHLIGHTED}
                  onSelect={() => handleSelect(name)}
                  busy={busy && selectedPlan === name}
                />
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Shared feature list */}
      <section className="mt-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <h2 className="text-center text-2xl sm:text-3xl font-bold font-display text-navy-700">
          Everything included in every plan
        </h2>
        <ul className="mt-8 grid sm:grid-cols-2 gap-x-10 gap-y-4">
          {SHARED_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-gray-700">
              <Check size={20} className="text-success mt-0.5 shrink-0" aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-center text-sm text-gray-500">
          Browsing Jobkarbe is always free. A subscription unlocks the details behind premium listings: apply links,
          salary data and HR contacts.
        </p>
        <p className="mt-6 mx-auto max-w-3xl text-center text-sm text-gray-500">
          Premium access is delivered instantly. We review refund requests within 48 hours and refund within
          5 to 7 working days to your original payment method for: a wrong or duplicate charge, a payment where
          premium access was never unlocked, or a technical defect that prevents access you paid for. To raise one,
          email jobkarbe@gmail.com or visit our{' '}
          <Link href="/grievance" className="font-medium text-primary-600 hover:text-primary-700 underline">grievance page</Link>.
        </p>
      </section>

      {/* Checkout modal */}
      {checkoutOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Complete your purchase">
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold">Complete Your Purchase</h3>
            <p className="mt-2 text-gray-600">
              Selected plan: <strong>{selectedPlan}</strong> at ₹{plans.find((p) => p.name === selectedPlan)?.price.toLocaleString('en-IN')}
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
