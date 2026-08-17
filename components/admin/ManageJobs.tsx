'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import Button from '@/components/ui/Button'
import JobForm, { type JobFormValues } from '@/components/JobForm'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { JobListingRow } from '@/lib/database.types'

const STATUS_STYLES: Record<string, string> = {
  pending_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
}

interface EditorState {
  job: JobListingRow | null
  extra: { status: JobListingRow['status']; isFeatured: boolean; expiresAt: string }
}

function toFormValues(job: JobListingRow): JobFormValues {
  return {
    title: job.title,
    company: job.company,
    location: job.location ?? '',
    salary_range: job.salary_range ?? '',
    experience: job.experience ?? '',
    description: job.description ?? '',
    contact_info: job.contact_info ?? '',
    tags: (job.tags ?? []).join(', '),
    source_link: job.source_link ?? '',
    is_premium: Boolean(job.is_premium),
  }
}

export default function ManageJobs() {
  const { toast } = useToast()
  const [jobs, setJobs] = useState<JobListingRow[] | null>(null)
  const [search, setSearch] = useState('')
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('job_listings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    setJobs((data as JobListingRow[]) ?? [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(
    () =>
      (jobs ?? []).filter((j) => {
        const q = search.toLowerCase()
        return !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)
      }),
    [jobs, search],
  )

  const openAdd = () =>
    setEditor({
      job: null,
      extra: {
        status: 'pending_review',
        isFeatured: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      },
    })

  const openEdit = (job: JobListingRow) =>
    setEditor({
      job,
      extra: {
        status: job.status,
        isFeatured: Boolean(job.is_featured),
        expiresAt: (job.expires_at ?? '').slice(0, 10),
      },
    })

  const save = async (values: JobFormValues) => {
    if (!editor) return
    setSaving(true)
    const payload = {
      title: values.title.trim(),
      company: values.company.trim(),
      location: values.location.trim() || null,
      salary_range: values.salary_range.trim() || null,
      experience: values.experience.trim() || null,
      description: values.description.trim() || null,
      contact_info: values.contact_info.trim() || null,
      source_link: values.source_link.trim() || null,
      tags: values.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8),
      is_premium: values.is_premium,
      is_featured: editor.extra.isFeatured,
      featured_until: editor.extra.isFeatured ? new Date().toISOString() : null,
      status: editor.extra.status,
      expires_at: editor.extra.expiresAt ? new Date(`${editor.extra.expiresAt}T23:59:59`).toISOString() : null,
    }

    const { error } = editor.job
      ? await supabase.from('job_listings').update(payload).eq('id', editor.job.id)
      : await supabase.from('job_listings').insert({ ...payload, approved_at: editor.extra.status === 'approved' ? new Date().toISOString() : null })

    setSaving(false)
    if (error) {
      toast('Could not save the job.', 'error')
      return
    }
    toast(editor.job ? 'Job updated' : 'Job created')
    setEditor(null)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search title or company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Search jobs"
        />
        <Button size="sm" onClick={openAdd}>
          <Plus size={14} className="mr-1" aria-hidden /> Add Job
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {jobs === null ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No jobs match. {jobs.length === 0 ? 'Add your first job.' : ''}</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filtered.map((job) => (
              <li key={job.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-gray-900 truncate">{job.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[job.status]}`}>{job.status.replace('_', ' ')}</span>
                    {job.is_premium && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Premium</span>}
                    {job.is_featured && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Featured</span>}
                  </div>
                  <p className="text-sm text-gray-500">{job.company} · {job.location ?? '—'}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(job)} aria-label={`Edit ${job.title}`}>
                  <Pencil size={14} className="mr-1" aria-hidden /> Edit
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={editor.job ? 'Edit job' : 'Add job'}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold">{editor.job ? `Edit: ${editor.job.title}` : 'Add Job'}</h3>
            <JobForm
              key={editor.job?.id ?? 'new'}
              initial={editor.job ? toFormValues(editor.job) : undefined}
              submitLabel={saving ? 'Saving…' : 'Save'}
              busy={saving}
              onSubmit={save}
            />
            <div className="mt-4 grid sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="mj-status" className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  id="mj-status"
                  value={editor.extra.status}
                  onChange={(e) => setEditor((p) => p && { ...p, extra: { ...p.extra, status: e.target.value as JobListingRow['status'] } })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="pending_review">Pending review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label htmlFor="mj-featured" className="block text-sm font-medium text-gray-700">Featured</label>
                <input
                  id="mj-featured"
                  type="checkbox"
                  checked={editor.extra.isFeatured}
                  onChange={(e) => setEditor((p) => p && { ...p, extra: { ...p.extra, isFeatured: e.target.checked } })}
                  className="mt-3 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="mj-expires" className="block text-sm font-medium text-gray-700">Expires on</label>
                <input
                  id="mj-expires"
                  type="date"
                  value={editor.extra.expiresAt}
                  onChange={(e) => setEditor((p) => p && { ...p, extra: { ...p.extra, expiresAt: e.target.value } })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" onClick={() => setEditor(null)} disabled={saving}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
