'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ProfileRow } from '@/lib/database.types'

interface AgentRow extends ProfileRow {
  submissions: number
  approved: number
  pending: number
}

export default function AgentsTab() {
  const [agents, setAgents] = useState<AgentRow[] | null>(null)

  const load = useCallback(async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'agent')
      .order('created_at', { ascending: false })
    const rows = (profiles as ProfileRow[] | null) ?? []
    if (rows.length === 0) {
      setAgents([])
      return
    }
    const { data: jobs } = await supabase
      .from('job_listings')
      .select('agent_id, status')
      .in('agent_id', rows.map((r) => r.id))
    const counts = new Map<string, { total: number; approved: number; pending: number }>()
    for (const j of jobs ?? []) {
      const agentId = j.agent_id ?? ''  // FK is on delete set null
      const c = counts.get(agentId) ?? { total: 0, approved: 0, pending: 0 }
      c.total++
      if (j.status === 'approved') c.approved++
      if (j.status === 'pending_review') c.pending++
      counts.set(agentId, c)
    }
    setAgents(
      rows.map((r) => ({
        ...r,
        submissions: counts.get(r.id)?.total ?? 0,
        approved: counts.get(r.id)?.approved ?? 0,
        pending: counts.get(r.id)?.pending ?? 0,
      })),
    )
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">Agents</h2>
      </div>
      {agents === null ? (
        <div className="p-8 text-center text-gray-500">Loading…</div>
      ) : agents.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No agents yet. Create one in Supabase Auth, then set <code className="text-sm bg-gray-100 px-1 rounded">role='agent'</code>.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submissions</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approved</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {agents.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 text-sm font-medium">{a.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm">{a.email}</td>
                  <td className="px-4 py-3 text-sm">{a.submissions}</td>
                  <td className="px-4 py-3 text-sm text-green-600">{a.approved}</td>
                  <td className="px-4 py-3 text-sm text-amber-600">{a.pending}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(a.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
