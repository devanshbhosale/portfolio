import { motion } from 'framer-motion'
import { MapPin, Briefcase, Clock, Tag } from 'lucide-react'
import { Job } from '@/data/jobs'

interface JobCardProps {
  job: Job
  index?: number
  isPremium?: boolean
  onApply?: () => void
}

export default function JobCard({ job, index = 0, isPremium = false, onApply }: JobCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 120 }}
      whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
      className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-primary-200 cursor-pointer"
      onClick={onApply}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
          <p className="text-sm text-gray-600">{job.company}</p>
        </div>
        {isPremium && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            Premium
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-500">
        <span className="inline-flex items-center gap-1"><MapPin size={14} /> {job.location}</span>
        <span className="inline-flex items-center gap-1"><Briefcase size={14} /> {job.experience}</span>
        <span className="inline-flex items-center gap-1"><Clock size={14} /> {job.salary}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {job.tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-700">
            <Tag size={12} /> {tag}
          </span>
        ))}
      </div>
    </motion.div>
  )
}
