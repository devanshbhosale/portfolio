'use client'
import { motion } from 'framer-motion'
import { Building2, Lock, MapPin, Briefcase, IndianRupee, Tag, Sparkles } from 'lucide-react'
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
      className="relative card-glass rounded-xl p-5 group"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
          <Sparkles size={12} aria-hidden /> Premium
        </span>
        <span className="inline-flex items-center gap-1 text-sm text-gray-500">
          <Lock size={14} aria-hidden /> Locked
        </span>
      </div>

      {/* The only revealed content — the server never sends more than this prefix. */}
      <h3 className="mt-3 text-lg font-bold text-gray-900 truncate">{job.title_prefix}…</h3>

      {/* Styling only — the row blurs the server's placeholder, never a real name. */}
      <div className="blur-premium select-none mt-1.5 flex items-center gap-1.5 text-sm text-gray-600" aria-hidden>
        <Building2 size={14} aria-hidden /> {job.company}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
        {job.location && (
          <span className="blur-premium select-none inline-flex items-center gap-1" aria-hidden>
            <MapPin size={14} aria-hidden /> {job.location}
          </span>
        )}
        {job.experience && <span className="inline-flex items-center gap-1"><Briefcase size={14} aria-hidden /> {job.experience}</span>}
        {job.salary_range && <span className="inline-flex items-center gap-1"><IndianRupee size={14} aria-hidden /> {job.salary_range}</span>}
      </div>

      {(job.tags ?? []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(job.tags ?? []).slice(0, 5).map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-gray-100 text-xs text-gray-700">
              <Tag size={12} aria-hidden /> {tag}
            </span>
          ))}
        </div>
      )}

      <button
        className="absolute inset-0 flex items-center justify-center rounded-xl cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent-500"
        onClick={lock}
        aria-label={`Unlock premium job: ${job.title_prefix}… (${cta})`}
      >
        <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-500 group-hover:bg-accent-600 text-white rounded-full text-sm font-semibold shadow-xs transition-colors">
          <Lock size={14} aria-hidden /> {cta}
        </span>
      </button>
    </motion.div>
  )
}
