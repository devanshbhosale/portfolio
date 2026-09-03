'use client'
import { motion } from 'framer-motion'
import { Building2, Lock, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { TeaserJob } from '@/lib/jobRedaction'

interface BlurredJobCardProps {
  job: TeaserJob
  index?: number
  /** Entry (Weekly) plan price in rupees, server-sourced. Omit when
   *  unknown — the CTA then reads plain "Unlock" (never a wrong price). */
  unlockFrom?: number
  /** Optional override (client pages pop the PaywallModal); default
   *  navigates to /pricing — server pages can't pass functions. */
  onLockClick?: () => void
}

export default function BlurredJobCard({ job, index = 0, unlockFrom, onLockClick }: BlurredJobCardProps) {
  const router = useRouter()
  const lock = () => (onLockClick ? onLockClick() : router.push('/pricing'))
  const cta = unlockFrom != null ? `Unlock from ₹${Math.round(unlockFrom)}` : 'Unlock'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.05 }}
      whileHover={{ y: -4 }}
      className="relative bg-gray-900 rounded-xl p-5 border border-gray-800 shadow-sm group"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-600/20 text-primary-500 border border-primary-500/40">
          <Sparkles size={12} aria-hidden /> Premium
        </span>
        <span className="inline-flex items-center gap-1 text-sm text-gray-400">
          <Lock size={14} aria-hidden /> Locked
        </span>
      </div>

      {/* The only revealed content — the server never sends more than this prefix. */}
      <h3 className="mt-3 text-lg font-bold text-gray-100 truncate">{job.title_prefix}…</h3>

      {/* Styling only — decoy rows are already-redacted teaser fields, kept blurred. */}
      <div className="blur-premium select-none mt-1.5 flex items-center gap-1.5 text-sm text-gray-500" aria-hidden>
        <Building2 size={14} aria-hidden /> {job.company}
      </div>

      <div className="mt-4 rounded-lg bg-white/5 px-4 py-8">
        <div className="blur-premium select-none flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500" aria-hidden>
          {job.salary_range && <span>{job.salary_range}</span>}
          <span>{job.location}</span>
          <span>{job.experience}</span>
        </div>
      </div>

      <button
        className="absolute inset-0 flex items-center justify-center rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        onClick={lock}
        aria-label={`Unlock premium job: ${job.title_prefix}… — ${cta}`}
      >
        <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-500 group-hover:bg-accent-600 text-white rounded-full text-sm font-semibold shadow-sm transition-colors">
          <Lock size={14} aria-hidden /> {cta}
        </span>
      </button>
    </motion.div>
  )
}
