'use client'
import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import type { PlanName } from '@/lib/database.types'

export interface PlanCard {
  name: PlanName
  price: number        // rupees
  mrp: number          // rupees; display-only strike-through
  tagline: string
  billingNote: string
}

interface PricingCardProps {
  plan: PlanCard
  badge?: string
  highlighted?: boolean
  onSelect: () => void
  busy?: boolean
}

export default function PricingCard({ plan, badge, highlighted = false, onSelect, busy = false }: PricingCardProps) {
  const savingsPct = plan.mrp > plan.price ? Math.round((1 - plan.price / plan.mrp) * 100) : null
  return (
    <motion.div
      whileHover={{ y: -6 }}
      className={`relative flex flex-col rounded-2xl border bg-white p-8 ${
        highlighted ? 'border-navy-700 shadow-card-hover ring-2 ring-navy-700 lg:-my-4 lg:py-12' : 'border-gray-200 shadow-card'
      }`}
    >
      {badge && (
        <span
          className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider text-white ${
            highlighted ? 'bg-navy-700' : 'bg-navy-500'
          }`}
        >
          {badge}
        </span>
      )}
      <h3 className="text-lg font-bold text-navy-700">{plan.name}</h3>
      <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-5xl font-extrabold text-gray-900">₹{plan.price.toLocaleString('en-IN')}</span>
        {savingsPct != null && (
          <span className="text-sm text-gray-400 line-through">₹{plan.mrp.toLocaleString('en-IN')}</span>
        )}
      </div>
      {savingsPct != null && (
        <span className="mt-2 inline-flex w-fit items-center rounded-full bg-navy-50 px-3 py-0.5 text-xs font-semibold text-navy-700">
          Save {savingsPct}%
        </span>
      )}
      <p className="mt-4 text-sm font-medium text-primary-600">{plan.billingNote}</p>
      <p className="mt-1 text-sm text-gray-500">{plan.tagline}</p>
      <Button fullWidth variant={highlighted ? 'accent' : 'outline'} onClick={onSelect} disabled={busy} className="mt-8">
        {busy ? 'Opening checkout…' : 'Get Started'}
      </Button>
    </motion.div>
  )
}
