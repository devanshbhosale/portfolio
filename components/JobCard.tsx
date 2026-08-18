'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { MapPin, Briefcase, Clock, Tag, Star, Crown } from 'lucide-react'
import type { PublicJob } from '@/lib/database.types'

interface JobCardProps {
  job: PublicJob
  index?: number
  isPremium?: boolean
}

export default function JobCard({ job, index = 0, isPremium = false }: JobCardProps) {
  const featured = Boolean(job.is_featured && (!job.featured_until || new Date(job.featured_until).getTime() > Date.now()))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.05, type: 'spring', stiffness: 120 }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Link
        href={`/jobs/${job.id}`}
        className="block h-full bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-primary-200 hover:shadow-card-hover transition-all"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
            <p className="text-sm text-gray-600">{job.company}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {featured && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                <Star size={12} aria-hidden /> Featured
              </span>
            )}
            {isPremium && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                <Crown size={12} aria-hidden /> Premium
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
          {job.location && <span className="inline-flex items-center gap-1"><MapPin size={14} aria-hidden /> {job.location}</span>}
          {job.experience && <span className="inline-flex items-center gap-1"><Briefcase size={14} aria-hidden /> {job.experience}</span>}
          {job.salary_range && <span className="inline-flex items-center gap-1"><Clock size={14} aria-hidden /> {job.salary_range}</span>}
        </div>
        {(job.tags ?? []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(job.tags ?? []).slice(0, 5).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-700">
                <Tag size={12} aria-hidden /> {tag}
              </span>
            ))}
          </div>
        )}
      </Link>
    </motion.div>
  )
}
