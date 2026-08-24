'use client'
import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { appliedSet, markApplied, savedSet } from '@/lib/savedJobs'
import { markAppliedRemote } from '@/lib/jobMarks'
import { useAuth } from '@/contexts/AuthContext'

/** Apply link that records an "Applied ✓" state on click (device + account
 *  when logged in), so jobseekers can see which listings they went for. */
export default function ApplyButton({ jobId, href }: { jobId: string; href: string }) {
  const { user } = useAuth()
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
          if (user) markAppliedRemote(user.id, jobId, savedSet(window.localStorage).has(jobId))
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
