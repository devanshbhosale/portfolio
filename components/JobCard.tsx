'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { MapPin, Briefcase, IndianRupee, Star, ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { isFeaturedNow } from '@/lib/freshness'
import type { PublicJob } from '@/lib/database.types'

interface JobCardProps {
  job: PublicJob
  index?: number
  /** Highlights the card as a Featured (is_premium) listing. */
  isPremium?: boolean
  /** Optional overlay action (Save heart) rendered above the card's link. */
  action?: ReactNode
}

export default function JobCard({ job, index = 0, isPremium = false, action }: JobCardProps) {
  const featured = isFeaturedNow(job) || isPremium

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.05, type: 'spring', stiffness: 120 }}
      whileHover={{ y: -4 }}
      className="relative h-full"
    >
      {action && <div className="absolute top-3 right-3 z-10">{action}</div>}
      <Link
        href={`/jobs/${job.id}`}
        className="flex h-full flex-col bg-white rounded-xl p-5 border border-gray-200 shadow-xs hover:border-primary-200 hover:shadow-card-hover transition-all"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="line-clamp-2 pr-7 text-lg font-bold text-gray-900">{job.title}</h3>
            <p className="text-sm text-gray-600">{job.company}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0 pr-9">
            {featured && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 whitespace-nowrap">
                <Star size={12} aria-hidden /> Featured
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
          {job.location && <span className="inline-flex items-center gap-1"><MapPin size={14} aria-hidden /> {job.location}</span>}
          {job.experience && <span className="inline-flex items-center gap-1"><Briefcase size={14} aria-hidden /> {job.experience}</span>}
          {job.salary_range && <span className="inline-flex items-center gap-1"><IndianRupee size={14} aria-hidden /> {job.salary_range}</span>}
        </div>
        {(job.tags ?? []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(job.tags ?? []).slice(0, 5).map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-sm bg-gray-100 text-xs text-gray-700">
                {tag}
              </span>
            ))}
          </div>
        )}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-primary-600">
          View job <ArrowRight size={14} aria-hidden />
        </span>
      </Link>
    </motion.div>
  )
}
