'use client'
import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { WithdrawalRequestRow } from '@/lib/database.types'

export default function Withdrawals() {
  const { toast } = useToast()
  const [pending, setPending] = useState<WithdrawalRequestRow[] | null>(null)
  const [recent, setRecent] = useState<WithdrawalRequestRow[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    const all = (data as WithdrawalRequestRow[]) ?? []
    setPending(all.filter((w) => w.status === 'pending'))
    setRecent(all.filter((w) => w.status !== 'pending').slice(0, 10))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const approve = async (w: WithdrawalRequestRow) => {
    setBusyId(w.id)
    const { error } = await supabase.rpc('approve_withdrawal', { p_id: w.id })
    setBusyId(null)
    if (error) {
      toast(error.message.includes('insufficient') ? `Cannot approve: ${error.message}` : 'Approval failed — try again.', 'error')
      return
    }
    toast(`Withdrawal of ₹${w.amount.toFixed(2)} approved`)
    load()
  }

  const reject = async (w: WithdrawalRequestRow) => {
    const note = (notes[w.id] ?? '').trim()
    if (note.length < 3) {
      toast('Add a note explaining the rejection.', 'error')
      return
    }
    setBusyId(w.id)
    const { error } = await supabase
      .from('withdrawal_requests')
      .update({ status: 'rejected', admin_notes: note, processed_at: new Date().toISOString() })
      .eq('id', w.id)
    setBusyId(null)
    if (error) {
      toast('Rejection failed — try again.', 'error')
      return
    }
    toast('Withdrawal rejected')
    load()
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Pending Withdrawals</h2>
        </div>
        {pending === null ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No pending withdrawals.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {pending.map((w) => (
              <li key={w.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">₹{w.amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{new Date(w.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-sm text-gray-600 text-right">
                    <p>{w.bank_holder_name}</p>
                    <p className="font-mono">{w.bank_account_number} · {w.bank_ifsc}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Note (required for rejection)"
                    value={notes[w.id] ?? ''}
                    onChange={(e) => setNotes((p) => ({ ...p, [w.id]: e.target.value }))}
                    className="flex-1 min-w-48 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <Button size="sm" variant="primary" onClick={() => approve(w)} disabled={busyId === w.id}>
                    <CheckCircle2 size={14} className="mr-1" aria-hidden /> Approve & pay
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => reject(w)} disabled={busyId === w.id}>
                    <XCircle size={14} className="mr-1 text-red-500" aria-hidden /> Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {recent.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800">Recently Processed</h2>
          </div>
          <ul className="divide-y divide-gray-200">
            {recent.map((w) => (
              <li key={w.id} className="p-3 flex items-center justify-between text-sm">
                <span>₹{w.amount.toFixed(2)} · {new Date(w.created_at).toLocaleDateString()}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${w.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                  {w.status}{w.admin_notes ? ` — ${w.admin_notes}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
