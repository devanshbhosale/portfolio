'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'

export interface JobFormValues {
  title: string
  company: string
  location: string
  salary_range: string
  experience: string
  description: string
  contact_info: string
  tags: string
  source_link: string
  is_premium: boolean
}

const EMPTY: JobFormValues = {
  title: '', company: '', location: '', salary_range: '', experience: '',
  description: '', contact_info: '', tags: '', source_link: '', is_premium: false,
}

interface JobFormProps {
  initial?: Partial<JobFormValues>
  submitLabel: string
  busy?: boolean
  error?: string | null
  onSubmit: (values: JobFormValues) => void | Promise<void>
}

const inputClass =
  'mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'

/** Shared job editor for the agent and admin dashboards. */
export default function JobForm({ initial, submitLabel, busy = false, error, onSubmit }: JobFormProps) {
  const [values, setValues] = useState<JobFormValues>({ ...EMPTY, ...initial })
  const [clientError, setClientError] = useState<string | null>(null)

  const set = (key: keyof JobFormValues, value: string | boolean) =>
    setValues((v) => ({ ...v, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (values.title.trim().length < 3 || values.company.trim().length < 2) {
      setClientError('Title (3+ chars) and company (2+ chars) are required.')
      return
    }
    setClientError(null)
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="jf-title" className="block text-sm font-medium text-gray-700">Job title *</label>
          <input id="jf-title" type="text" required value={values.title} onChange={(e) => set('title', e.target.value)} className={inputClass} placeholder="Delivery Driver" />
        </div>
        <div>
          <label htmlFor="jf-company" className="block text-sm font-medium text-gray-700">Company *</label>
          <input id="jf-company" type="text" required value={values.company} onChange={(e) => set('company', e.target.value)} className={inputClass} placeholder="Swiggy" />
        </div>
        <div>
          <label htmlFor="jf-location" className="block text-sm font-medium text-gray-700">Location</label>
          <input id="jf-location" type="text" value={values.location} onChange={(e) => set('location', e.target.value)} className={inputClass} placeholder="Mumbai" />
        </div>
        <div>
          <label htmlFor="jf-salary" className="block text-sm font-medium text-gray-700">Salary range</label>
          <input id="jf-salary" type="text" value={values.salary_range} onChange={(e) => set('salary_range', e.target.value)} className={inputClass} placeholder="₹18,000 - ₹22,000" />
        </div>
        <div>
          <label htmlFor="jf-experience" className="block text-sm font-medium text-gray-700">Experience</label>
          <input id="jf-experience" type="text" value={values.experience} onChange={(e) => set('experience', e.target.value)} className={inputClass} placeholder="0-2 yrs" />
        </div>
        <div>
          <label htmlFor="jf-tags" className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
          <input id="jf-tags" type="text" value={values.tags} onChange={(e) => set('tags', e.target.value)} className={inputClass} placeholder="Full-time, On-field" />
        </div>
      </div>
      <div>
        <label htmlFor="jf-contact" className="block text-sm font-medium text-gray-700">HR contact (visible to premium members)</label>
        <input id="jf-contact" type="text" value={values.contact_info} onChange={(e) => set('contact_info', e.target.value)} className={inputClass} placeholder="HR: Name, 98xxx xxxxx, email@company.com" />
      </div>
      <div>
        <label htmlFor="jf-source" className="block text-sm font-medium text-gray-700">Source link</label>
        <input id="jf-source" type="url" value={values.source_link} onChange={(e) => set('source_link', e.target.value)} className={inputClass} placeholder="https://example.com/job/123" />
      </div>
      <div>
        <label htmlFor="jf-description" className="block text-sm font-medium text-gray-700">Description</label>
        <textarea id="jf-description" rows={4} value={values.description} onChange={(e) => set('description', e.target.value)} className={inputClass} placeholder="What the job involves, requirements, shifts…" />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={values.is_premium}
          onChange={(e) => set('is_premium', e.target.checked)}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        Request premium listing
      </label>

      {(clientError ?? error) && (
        <p role="alert" className="text-sm text-red-600">{clientError ?? error}</p>
      )}

      <Button type="submit" variant="accent" disabled={busy}>
        {busy ? 'Submitting…' : submitLabel}
      </Button>
    </form>
  )
}
