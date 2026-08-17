'use client'
import { useCallback, useEffect, useState } from 'react'
import { Link2, Upload, RefreshCw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/lib/toast'
import Button from '@/components/ui/Button'
import JobForm, { type JobFormValues } from '@/components/JobForm'
import { supabase } from '@/lib/supabase'
import type { JobListingRow } from '@/lib/database.types'

const STATUS_STYLES: Record<string, string> = {
  pending_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
}

export default function AgentDashboard() {
  const { user, authLoading } = useAuth()
  const { toast } = useToast()

  const [link, setLink] = useState('')
  const [fetching, setFetching] = useState(false)
  const [formInitial, setFormInitial] = useState<Partial<JobFormValues> | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [jobs, setJobs] = useState<JobListingRow[]>([])
  const [renewingId, setRenewingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('job_listings')
      .select('*')
      .eq('agent_id', user.id)
      .order('created_at', { ascending: false })
    setJobs((data as JobListingRow[]) ?? [])
  }, [user])

  useEffect(() => {
    load()
    if (!user) return
    // Live sync: admin actions reflect here immediately.
    const channel = supabase
      .channel(`agent-jobs-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_listings', filter: `agent_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load, user])

  if (authLoading) return <div className="py-16 text-center text-gray-500">Loading…</div>
  if (!user || (user.role !== 'agent' && user.role !== 'admin')) {
    return <div className="py-16 text-center">Access restricted to agents.</div>
  }

  const handleParse = async () => {
    if (!link.trim()) return
    setFetching(true)
    try {
      const res = await fetch('/api/agent/parse-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link.trim() }),
      })
      const data = (await res.json()) as {
        title?: string; company?: string; location?: string; salary?: string; description?: string; error?: string
      }
      if (!res.ok || !data.title) {
        toast(data.error ?? 'Could not auto-parse. Fill the details manually.', 'error')
        setFormInitial({ source_link: link.trim() })
        return
      }
      setFormInitial({
        title: data.title,
        company: data.company ?? '',
        location: data.location ?? '',
        salary_range: data.salary ?? '',
        description: data.description ?? '',
        source_link: link.trim(),
      })
      toast('Details fetched — review and edit before submitting.')
    } catch {
      toast('Network error while fetching the link.', 'error')
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async (values: JobFormValues) => {
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/agent/submit-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          tags: values.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8),
          source_link: values.source_link.trim() || undefined,
        }),
      })
      const data = (await res.json()) as { error?: string; warning?: string | null }
      if (!res.ok) {
        setFormError(data.error ?? 'Could not submit the job.')
        return
      }
      toast('Submitted! Waiting for admin approval.')
      if (data.warning) toast(data.warning, 'error')
      setFormInitial(undefined)
      setLink('')
      load()
    } catch {
      setFormError('Network error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRenew = async (jobId: string) => {
    setRenewingId(jobId)
    try {
      const res = await fetch('/api/agent/renew-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })
      const data = (await res.json()) as { error?: string; expires_at?: string }
      if (!res.ok) {
        toast(data.error ?? 'Could not renew the job.', 'error')
        return
      }
      toast('Job renewed — expiry reset.')
      load()
    } finally {
      setRenewingId(null)
    }
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900">Agent Dashboard</h1>
      <p className="mt-2 text-gray-600">Add new job listings by pasting a link. Jobs go live after admin review.</p>

      <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <label htmlFor="job-link" className="block text-sm font-medium text-gray-700">Job link</label>
        <div className="mt-2 flex flex-col sm:flex-row gap-3">
          <input
            id="job-link"
            type="url"
            placeholder="https://example.com/job/123"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button onClick={handleParse} disabled={fetching || !link.trim()}>
            {fetching ? <><RefreshCw size={16} className="mr-1 animate-spin" aria-hidden /> Fetching…</> : <><Link2 size={16} className="mr-1" aria-hidden /> Fetch Details</>}
          </Button>
        </div>
        <p className="mt-2 text-xs text-gray-400">Auto-fill is best-effort — always review the details below before submitting.</p>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {formInitial?.title ? `Editing: ${formInitial.title}` : 'New job details'}
          </h2>
          <JobForm
            key={formInitial?.source_link ?? 'empty'}
            initial={formInitial}
            submitLabel="Submit for Review"
            busy={submitting}
            error={formError}
            onSubmit={handleSubmit}
          />
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">My Submissions</h2>
          <Button variant="ghost" size="sm" onClick={load} aria-label="Refresh submissions">
            <RefreshCw size={14} aria-hidden /> Refresh
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {jobs.map((job) => {
            const left = daysLeft(job.expires_at)
            return (
              <div key={job.id} className="bg-white p-4 rounded-lg border border-gray-200 flex flex-wrap gap-3 justify-between items-center">
                <div className="min-w-0">
                  <h3 className="font-medium text-gray-900">{job.title}</h3>
                  <p className="text-sm text-gray-500 truncate">{job.company} · {job.location ?? '—'}</p>
                  {job.status === 'rejected' && job.admin_notes && (
                    <p className="mt-1 text-sm text-red-600">Rejected: {job.admin_notes}</p>
                  )}
                  {job.status === 'approved' && left !== null && (
                    <p className={`mt-1 text-xs ${left <= 3 ? 'text-red-500' : 'text-gray-400'}`}>
                      {left > 0 ? `Expires in ${left} day${left === 1 ? '' : 's'}` : 'Expired — renew to relist'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[job.status]}`}>
                    {job.status.replace('_', ' ')}
                  </span>
                  {job.status === 'approved' && (
                    <Button variant="outline" size="sm" onClick={() => handleRenew(job.id)} disabled={renewingId === job.id}>
                      <Upload size={14} className="mr-1" aria-hidden /> {renewingId === job.id ? 'Renewing…' : 'Renew'}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
          {jobs.length === 0 && <p className="text-gray-500">No submissions yet.</p>}
        </div>
      </div>
    </div>
  )
}
