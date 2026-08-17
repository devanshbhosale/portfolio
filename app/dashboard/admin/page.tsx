'use client'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import PendingJobs from '@/components/admin/PendingJobs'
import ManageJobs from '@/components/admin/ManageJobs'
import Purchases from '@/components/admin/Purchases'
import Withdrawals from '@/components/admin/Withdrawals'
import AgentsTab from '@/components/admin/AgentsTab'
import Analytics from '@/components/admin/Analytics'
import SettingsTab from '@/components/admin/SettingsTab'

const TABS = [
  { id: 'pending', label: 'Pending Jobs' },
  { id: 'jobs', label: 'Manage Jobs' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'withdrawals', label: 'Withdrawals' },
  { id: 'agents', label: 'Agents' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Settings' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function AdminDashboard() {
  const { user, authLoading } = useAuth()
  const [tab, setTab] = useState<TabId>('pending')

  if (authLoading) return <div className="py-16 text-center text-gray-500">Loading…</div>
  if (!user || user.role !== 'admin') {
    return <div className="py-16 text-center">Access restricted to admins.</div>
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
      <p className="mt-2 text-gray-600">Manage listings, payouts, agents, and site settings.</p>

      <div role="tablist" aria-label="Admin sections" className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'pending' && <PendingJobs />}
        {tab === 'jobs' && <ManageJobs />}
        {tab === 'purchases' && <Purchases />}
        {tab === 'withdrawals' && <Withdrawals />}
        {tab === 'agents' && <AgentsTab />}
        {tab === 'analytics' && <Analytics />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}
