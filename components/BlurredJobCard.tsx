import { motion } from 'framer-motion'
import { Lock, Eye } from 'lucide-react'
import { Job } from '@/data/jobs'

interface BlurredJobCardProps {
  job: Job
  index?: number
  onLockClick: () => void
}

export default function BlurredJobCard({ job, index = 0, onLockClick }: BlurredJobCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="relative bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md cursor-pointer group"
      onClick={onLockClick}
    >
      <div className="blur-premium select-none">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 opacity-30">{job.title.slice(0, 3)}...</h3>
            <p className="text-sm text-gray-600 opacity-30">{job.company}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-500 opacity-30">
          <span>{job.location}</span>
          <span>{job.experience}</span>
        </div>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="text-center p-4">
          <Lock className="mx-auto text-primary-600 mb-2" size={24} />
          <p className="font-semibold text-gray-800">Premium Listing</p>
          <p className="text-sm text-gray-500">Unlock to view full details</p>
          <button
            className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm"
            onClick={(e) => { e.stopPropagation(); onLockClick(); }}
          >
            <Eye size={14} /> View
          </button>
        </div>
      </div>
    </motion.div>
  )
}
