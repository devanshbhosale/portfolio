'use client'
import { CheckCircle2, XCircle, Users, Briefcase, Banknote } from 'lucide-react'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'

export default function AdminDashboard() {
  const { user } = useAuth()
  const { jobs, setJobs, withdrawals, approveWithdrawal } = useData()

  if (user?.role !== 'admin') {
    return <div className="py-16 text-center">Access restricted to admins.</div>
  }

  const pendingJobs = jobs.filter(j => j.status === 'pending')
  const approvedJobs = jobs.filter(j => j.status === 'approved')
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending')

  const approveJob = (id: string) => {
    setJobs(jobs.map(j => j.id === id ? { ...j, status: 'approved' } : j))
  }
  const rejectJob = (id: string) => {
    setJobs(jobs.filter(j => j.id !== id))
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
      <p className="mt-2 text-gray-600">Manage listings, withdrawals, and users.</p>

      <div className="mt-8 grid md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500"><Briefcase size={18} /> Pending Listings</div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{pendingJobs.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500"><Banknote size={18} /> Pending Withdrawals</div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{pendingWithdrawals.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500"><Users size={18} /> Active Jobs</div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{approvedJobs.length}</p>
        </div>
      </div>

      <div className="mt-10 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Review Listings</h2>
        </div>
        <ul className="divide-y divide-gray-200">
          {pendingJobs.map(job => (
            <li key={job.id} className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium">{job.title}</h3>
                <p className="text-sm text-gray-500">{job.company} · {job.location} · {job.salary}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={() => approveJob(job.id)}>
                  <CheckCircle2 size={14} className="mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => rejectJob(job.id)}>
                  <XCircle size={14} className="mr-1 text-red-500" /> Reject
                </Button>
              </div>
            </li>
          ))}
          {pendingJobs.length === 0 && <li className="p-4 text-gray-500">No pending listings.</li>}
        </ul>
      </div>

      <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Approve Withdrawals</h2>
        </div>
        <ul className="divide-y divide-gray-200">
          {pendingWithdrawals.map(w => (
            <li key={w.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">Request ID: {w.id}</p>
                <p className="text-sm text-gray-500">Amount: ₹{w.amount} · Bank: {w.bankAccount}</p>
              </div>
              <Button size="sm" variant="accent" onClick={() => approveWithdrawal(w.id)}>Approve</Button>
            </li>
          ))}
          {pendingWithdrawals.length === 0 && <li className="p-4 text-gray-500">No pending withdrawals.</li>}
        </ul>
      </div>
    </div>
  )
}
