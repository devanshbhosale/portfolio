'use client'
import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { appliedSet, markApplied } from '@/lib/savedJobs'

/** Apply link that records a per-browser "Applied ✓" state on click, so
 *  jobseekers can see which listings they already went for. */
export default function ApplyButton({ jobId, href }: { jobId: string; href: string }) {
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    setApplied(appliedSet(window.localStorage).has(jobId))
  }, [jobId])

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={() => {
          markApplied(window.localStorage, jobId)
          setApplied(true)
        }}
        className="inline-flex items-center justify-center rounded-lg font-semibold bg-primary-600 text-white hover:bg-primary-700 px-6 py-3 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        Apply now ↗
      </a>
      {applied && (
        <span className="inline-flex items-center gap-1 text-sm text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
          <CheckCircle2 size={14} aria-hidden /> Applied
        </span>
      )}
    </div>
  )
}
