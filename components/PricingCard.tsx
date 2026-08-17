import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'

interface PricingCardProps {
  plan: {
    duration: string
    price: number
    originalPrice: number
    perks: string[]
  }
  onSelect: () => void
  isSelected: boolean
}

export default function PricingCard({ plan, onSelect, isSelected }: PricingCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
      className={`bg-white rounded-2xl border p-6 flex flex-col ${isSelected ? 'border-primary-500 ring-2 ring-primary-500' : 'border-gray-200'}`}
    >
      <h3 className="text-lg font-bold text-gray-900">{plan.duration}</h3>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-extrabold text-gray-900">₹{plan.price}</span>
        <span className="text-sm text-gray-500 line-through">₹{plan.originalPrice}</span>
      </div>
      <ul className="mt-6 space-y-3 flex-1">
        {plan.perks.map(perk => (
          <li key={perk} className="flex items-start gap-2 text-sm text-gray-600">
            <Check size={16} className="text-primary-600 mt-0.5" />
            {perk}
          </li>
        ))}
      </ul>
      <Button
        fullWidth
        variant={isSelected ? 'accent' : 'primary'}
        onClick={onSelect}
        className="mt-6"
      >
        Select Plan
      </Button>
    </motion.div>
  )
}
