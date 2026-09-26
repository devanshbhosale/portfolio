'use client'
import { useSyncExternalStore } from 'react'
import { Heart } from 'lucide-react'
import { getSavedHasSnapshot, subscribeJobMemory, toggleSaved } from '@/lib/savedJobs'
import { setSavedRemote } from '@/lib/jobMarks'
import { useAuth } from '@/contexts/AuthContext'

/** Per-browser save toggle with account sync for logged-in users. The saved
 *  flag lives in localStorage read through the job-memory store: a write
 *  here re-renders every mounted heart (and the /jobs "Saved" tier via its
 *  own subscription) with no prop plumbing; cross-tab sync via the storage
 *  event; false server snapshot keeps SSR/hydration consistent. */
export default function SaveHeart({ jobId, size = 16 }: { jobId: string; size?: number }) {
  const { user } = useAuth()
  const saved = useSyncExternalStore(subscribeJobMemory, getSavedHasSnapshot(jobId), () => false)

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const next = toggleSaved(window.localStorage, jobId)
    if (user) setSavedRemote(user.id, jobId, next.has(jobId))
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved jobs' : 'Save this job'}
      title={saved ? 'Saved. Click to remove' : 'Save this job'}
      className={`inline-flex items-center justify-center p-2 rounded-full bg-white/95 border shadow-xs transition-colors ${
        saved ? 'border-red-200 text-red-500' : 'border-gray-200 text-gray-400 hover:text-red-400'
      }`}
    >
      <Heart size={size} fill={saved ? 'currentColor' : 'none'} aria-hidden />
    </button>
  )
}
