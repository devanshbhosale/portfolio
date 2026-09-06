'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flag, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/lib/toast'
import { REPORT_REASONS } from '@/lib/validation'

const REASON_LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  fake_scam: 'Fake or scam',
  expired: 'Expired or filled',
  asks_for_money: 'Asks for money to apply',
  discriminatory: 'Discriminatory',
  other: 'Something else',
}

const SUPPORT_EMAIL = 'jobkarsupport@gmail.com'

/** Report-this-listing control: modal for signed-in users (POST /api/reports),
 *  mailto fallback for signed-out visitors. Operator sees reports in the
 *  dashboard via the reports table (RLS operator-read). */
export default function ReportListingButton({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>('fake_scam')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  if (!user) {
    return (
      <a
        href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Job report: ' + jobTitle)}&body=${encodeURIComponent('Job link: /jobs/' + jobId + '\nProblem: ')}`}
        className="inline-flex items-center gap-1 mt-4 text-sm text-gray-500 hover:text-gray-700"
      >
        <Flag size={14} aria-hidden /> Report this listing
      </a>
    )
  }

  const submit = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, reason, note: note.trim() || undefined }),
      })
      if (res.ok) {
        setSent(true)
      } else if (res.status === 429) {
        toast('You have sent several reports recently. Try again later.', 'error')
        setOpen(false)
      } else {
        toast('Could not send the report. Try again.', 'error')
      }
    } catch {
      toast('Could not send the report. Try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 mt-4 text-sm text-gray-500 hover:text-gray-700"
      >
        <Flag size={14} aria-hidden /> Report this listing
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Report this listing"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setOpen(false)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" aria-label="Close">
                <X size={20} />
              </button>
              <div className="text-center mb-6">
                <div className="mx-auto w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mb-3">
                  <Flag size={24} className="text-primary-600" aria-hidden />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Report this listing</h3>
                <p className="text-sm text-gray-500 mt-1">Tell us what is wrong — we review reports within 36 hours.</p>
              </div>
              {sent ? (
                <div className="text-center">
                  <p className="text-gray-700">Thanks. Your report is with our review team.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setOpen(false)}>Close</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="report-reason" className="block text-sm font-medium text-gray-700">Reason</label>
                    <select
                      id="report-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value as (typeof REPORT_REASONS)[number])}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {REPORT_REASONS.map((r) => (
                        <option key={r} value={r}>{REASON_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="report-note" className="block text-sm font-medium text-gray-700">
                      Anything else? <span className="font-normal text-gray-500">(optional)</span>
                    </label>
                    <textarea
                      id="report-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      maxLength={500}
                      rows={3}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="What did you notice?"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
                    <Button variant="primary" onClick={submit} disabled={busy}>
                      {busy ? 'Sending…' : 'Send report'}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
