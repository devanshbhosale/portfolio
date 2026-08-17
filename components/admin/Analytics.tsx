'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '@/lib/supabase'
import type { PremiumPurchaseRow } from '@/lib/database.types'

const MONTHS = 6

export default function Analytics() {
  const [purchases, setPurchases] = useState<PremiumPurchaseRow[] | null>(null)

  const load = useCallback(async () => {
    const since = new Date()
    since.setMonth(since.getMonth() - (MONTHS - 1))
    since.setDate(1)
    const { data } = await supabase
      .from('premium_purchases')
      .select('*')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true })
    setPurchases((data as PremiumPurchaseRow[]) ?? [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const { series, revenue, purchasesCount, commissions } = useMemo(() => {
    const buckets = Array.from({ length: MONTHS }, (_, i) => {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - (MONTHS - 1 - i))
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
        revenue: 0,
        purchases: 0,
      }
    })
    const idx = new Map(buckets.map((b, i) => [b.key, i]))
    for (const p of purchases ?? []) {
      const d = new Date(p.created_at)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const i = idx.get(key)
      if (i !== undefined) {
        buckets[i].revenue += p.amount
        buckets[i].purchases++
      }
    }
    return {
      series: buckets,
      revenue: (purchases ?? []).reduce((s, p) => s + p.amount, 0),
      purchasesCount: (purchases ?? []).length,
      commissions: (purchases ?? []).reduce((s, p) => s + p.commission_amount, 0),
    }
  }, [purchases])

  if (purchases === null) return <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-500">Loading…</div>

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500">Revenue (last {MONTHS} months)</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">₹{revenue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500">Purchases</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{purchasesCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500">Commissions earned by referrers</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">₹{commissions.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Revenue by Month</h2>
        {purchases.length === 0 ? (
          <p className="text-gray-500 text-sm">No purchases in this window yet.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `₹${v}`} width={60} />
                <Tooltip formatter={(v) => `₹${Number(v).toFixed(2)}`} />
                <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
