'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link2, Upload, CheckCircle2 } from 'lucide-react'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'

export default function AgentDashboard() {
  const { user } = useAuth()
  const { jobs, setJobs } = useData()
  const [link, setLink] = useState('')
  const [autoFetched, setAutoFetched] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (user?.role !== 'agent') {
    return <div className="py-16 text-center">Access restricted to agents.</div>
  }

  const handlePasteAndFetch = () => {
    setAutoFetched(true)
    setTimeout(() => setAutoFetched(false), 1500)
  }

  const handleSubmit = () => {
    const newJob = {
      id: Date.now().toString(),
      title: 'New Job from Link',
      company: 'Company X',
      location: 'City',
      salary: '₹20,000 - ₹25,000',
      experience: '1-3 yrs',
      tags: ['Full-time'],
      premium: true,
      postedBy: user.id,
      status: 'pending',
    }
    setJobs([...jobs, newJob])
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900">Agent Dashboard</h1>
      <p className="mt-2 text-gray-600">Add new job listings by pasting a link. Jobs will be reviewed by admin before going live.</p>

      <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <label className="block text-sm font-medium text-gray-700">Job Link</label>
        <div className="mt-2 flex gap-3">
          <input
            type="url"
            placeholder="https://example.com/job/123"
            value={link}
            onChange={e => setLink(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button onClick={handlePasteAndFetch}>
            {autoFetched ? 'Fetching...' : 'Fetch Details'}
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: autoFetched ? 1 : 0, height: autoFetched ? 'auto' : 0 }}
          className="overflow-hidden"
        >
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-dashed">
            <p className="text-sm text-gray-600">Fetched from link:</p>
            <h3 className="font-semibold mt-1">Delivery Driver</h3>
            <p className="text-sm text-gray-500">Swiggy · Mumbai · ₹18,000 - ₹22,000</p>
          </div>
        </motion.div>

        <div className="mt-4 flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm">Mark as Premium</span>
          </label>
          <Button variant="accent" onClick={handleSubmit} disabled={!link}>
            <Upload size={16} className="mr-1" /> Submit for Review
          </Button>
        </div>
        {submitted && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-green-600 text-sm flex items-center gap-1">
            <CheckCircle2 size={14} /> Submitted! Waiting for admin approval.
          </motion.p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800">My Submissions</h2>
        <div className="mt-4 space-y-3">
          {jobs.filter(j => j.postedBy === user.id).map(job => (
            <div key={job.id} className="bg-white p-4 rounded-lg border border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="font-medium">{job.title}</h3>
                <p className="text-sm text-gray-500">{job.company} · {job.location}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                job.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {job.status}
              </span>
            </div>
          ))}
          {jobs.filter(j => j.postedBy === user.id).length === 0 && (
            <p className="text-gray-500">No submissions yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
