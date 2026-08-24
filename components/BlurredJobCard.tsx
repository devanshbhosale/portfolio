'use client'
import { motion } from 'framer-motion'
import { Lock, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { TeaserJob } from '@/lib/jobRedaction'

interface BlurredJobCardProps {
  job: TeaserJob
  index?: number
  /** Optional override (client pages pop the PaywallModal); default
   *  navigates to /pricing — server pages can't pass functions. */
  onLockClick?: () => void
}

export default function BlurredJobCard({ job, index = 0, onLockClick }: BlurredJobCardProps) {
  const router = useRouter()
  const lock = () => (onLockClick ? onLockClick() : router.push('/pricing'))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.05 }}
      whileHover={{ y: -4 }}
      className="relative bg-white rounded-xl p-5 border border-gray-200 shadow-sm cursor-pointer group"
    >
      {/* Styling only — the server already redacted premium fields. */}
      <div className="blur-premium select-none" aria-hidden>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 opacity-30">{job.title_prefix}…</h3>
            <p className="text-sm text-gray-600 opacity-30">{job.company}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-500 opacity-30">
          <span>{job.location}</span>
          <span>{job.experience}</span>
        </div>
      </div>

      <button
        className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity focus:opacity-100 rounded-xl"
        onClick={lock}
        aria-label={`Unlock premium job: ${job.title_prefix}… — view plans`}
      >
        <div className="text-center p-4">
          <Lock className="mx-auto text-primary-600 mb-2" size={24} aria-hidden />
          <p className="font-semibold text-gray-800">Premium Listing</p>
          <p className="text-sm text-gray-500">Unlock to view full details</p>
          <span className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm">
            <Eye size={14} aria-hidden /> View plans
          </span>
        </div>
      </button>
    </motion.div>
  )
}
