'use client'
import { useCallback, useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import type { PremiumPurchaseRow } from '@/lib/database.types'

interface PurchaseWithUser extends PremiumPurchaseRow {
  buyer_email?: string
  referrer_email?: string
}

const COMMISSION_LABELS: Record<string, string> = {
  none: '—', pending: 'pending', available: 'available', withdrawn: 'withdrawn', voided: 'voided',
}

export default function Purchases() {
  const [rows, setRows] = useState<PurchaseWithUser[] | null>(null)

  const load = useCallback(async () => {
    const { data: purchases } = await supabase
      .from('premium_purchases')
      .select('*, user:profiles!premium_purchases_user_id_fkey(email), referrer:profiles!premium_purchases_referrer_user_id_fkey(email)')
      .order('created_at', { ascending: false })
      .limit(500)
    const rows = ((purchases ?? []) as (PremiumPurchaseRow & { user?: { email?: string } | null; referrer?: { email?: string } | null })[]).map((p) => ({
      ...p,
      buyer_email: p.user?.email,
      referrer_email: p.referrer?.email,
    }))
    setRows(rows)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const exportCsv = () => {
    if (!rows) return
    const header = 'Date,Plan,Amount,Payment ID,Order ID,Buyer,Referral Code,Referrer,Commission,Commission Status'
    const lines = rows.map((r) =>
      [
        new Date(r.created_at).toISOString(),
        r.plan,
        r.amount,
        r.payment_id,
        r.order_id ?? '',
        r.buyer_email ?? '',
        r.referral_code_used ?? '',
        r.referrer_email ?? '',
        r.commission_amount,
        r.commission_status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    )
    const blob = new Blob([`\uFEFF${[header, ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jobkar-purchases-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-gray-800">Premium Purchases</h2>
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows || rows.length === 0}>
          <Download size={14} className="mr-1" aria-hidden /> Export CSV
        </Button>
      </div>
      {rows === null ? (
        <div className="p-8 text-center text-gray-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No purchases yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referral</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm">{r.plan}</td>
                  <td className="px-4 py-3 text-sm font-medium">₹{r.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">{r.buyer_email ?? '—'}</td>
                  <td className="px-4 py-3 text-sm">{r.referral_code_used ? `${r.referral_code_used}${r.referrer_email ? ` (${r.referrer_email})` : ''}` : '—'}</td>
                  <td className="px-4 py-3 text-sm">₹{r.commission_amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.commission_status === 'available' ? 'bg-green-100 text-green-800' : r.commission_status === 'withdrawn' ? 'bg-gray-200 text-gray-700' : r.commission_status === 'voided' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {COMMISSION_LABELS[r.commission_status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
