'use client'
import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { savedSet, toggleSaved } from '@/lib/savedJobs'
import { setSavedRemote } from '@/lib/jobMarks'
import { useAuth } from '@/contexts/AuthContext'

/** Per-browser save toggle with account sync for logged-in users.
 *  Self-reads on mount; onToggle lets the /jobs feed refresh its saved-set
 *  copy so the "Saved" tier filter stays current. */
export default function SaveHeart({
  jobId,
  size = 16,
  onToggle,
}: {
  jobId: string
  size?: number
  onToggle?: (jobId: string) => void
}) {
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setSaved(savedSet(window.localStorage).has(jobId))
    setReady(true)
  }, [jobId])

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const next = toggleSaved(window.localStorage, jobId)
    setSaved(next.has(jobId))
    if (user) setSavedRemote(user.id, jobId, next.has(jobId))
    onToggle?.(jobId)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!ready}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved jobs' : 'Save this job'}
      title={saved ? 'Saved — click to remove' : 'Save this job'}
      className={`inline-flex items-center justify-center p-2 rounded-full bg-white/95 border shadow-sm transition-colors ${
        saved ? 'border-red-200 text-red-500' : 'border-gray-200 text-gray-400 hover:text-red-400'
      }`}
    >
      <Heart size={size} fill={saved ? 'currentColor' : 'none'} aria-hidden />
    </button>
  )
}
