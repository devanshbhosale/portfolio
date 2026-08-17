'use client'
import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { JobListingRow } from '@/lib/database.types'

interface ReviewState {
  isPremium: boolean
  isFeatured: boolean
  note: string
}

export default function PendingJobs() {
  const { toast } = useToast()
  const [jobs, setJobs] = useState<JobListingRow[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [states, setStates] = useState<Record<string, ReviewState>>({})

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('job_listings')
      .select('*')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })
    setJobs((data as JobListingRow[]) ?? [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stateFor = (id: string): ReviewState => states[id] ?? { isPremium: false, isFeatured: false, note: '' }

  const decide = async (job: JobListingRow, approved: boolean) => {
    const s = stateFor(job.id)
    if (!approved && s.note.trim().length < 3) {
      toast('Add a short note explaining the rejection.', 'error')
      return
    }
    setBusyId(job.id)
    const featuredUntil = s.isFeatured ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null
    const { error } = await supabase
      .from('job_listings')
      .update(
        approved
          ? {
              status: 'approved',
              approved_at: new Date().toISOString(),
              is_premium: s.isPremium,
              is_featured: s.isFeatured,
              featured_until: featuredUntil,
              admin_notes: s.note.trim() || null,
            }
          : { status: 'rejected', admin_notes: s.note.trim() },
      )
      .eq('id', job.id)
    setBusyId(null)
    if (error) {
      toast('Action failed — try again.', 'error')
      return
    }
    toast(approved ? `"${job.title}" approved and live` : `"${job.title}" rejected`)
    setJobs((prev) => prev?.filter((j) => j.id !== job.id) ?? null)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">Review Listings</h2>
      </div>
      {jobs === null ? (
        <div className="p-8 text-center text-gray-500">Loading…</div>
      ) : jobs.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No pending listings. All caught up! 🎉</div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {jobs.map((job) => {
            const s = stateFor(job.id)
            return (
              <li key={job.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900">{job.title}</h3>
                    <p className="text-sm text-gray-500">
                      {job.company} · {job.location ?? '—'} · {job.salary_range ?? '—'}
                    </p>
                    {job.source_link && (
                      <a href={job.source_link} target="_blank" rel="noopener noreferrer nofollow" className="text-xs text-primary-600 hover:underline break-all">
                        {job.source_link}
                      </a>
                    )}
                    {job.description && (
                      <details className="mt-1">
                        <summary className="text-xs text-gray-400 cursor-pointer">Description</summary>
                        <p className="mt-1 text-sm text-gray-600 whitespace-pre-line">{job.description}</p>
                      </details>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={s.isPremium} onChange={(e) => setStates((p) => ({ ...p, [job.id]: { ...s, isPremium: e.target.checked } }))} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                      Premium
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={s.isFeatured} onChange={(e) => setStates((p) => ({ ...p, [job.id]: { ...s, isFeatured: e.target.checked } }))} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                      Featured (7 days)
                    </label>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Note to the agent (required for rejection)"
                    value={s.note}
                    onChange={(e) => setStates((p) => ({ ...p, [job.id]: { ...s, note: e.target.value } }))}
                    className="flex-1 min-w-48 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <Button size="sm" variant="primary" onClick={() => decide(job, true)} disabled={busyId === job.id}>
                    <CheckCircle2 size={14} className="mr-1" aria-hidden /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide(job, false)} disabled={busyId === job.id}>
                    <XCircle size={14} className="mr-1 text-red-500" aria-hidden /> Reject
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
