'use client'
import { useState, useMemo, useEffect } from 'react'
import { Search, MapPin, Briefcase } from 'lucide-react'
import JobCard from '@/components/JobCard'
import BlurredJobCard from '@/components/BlurredJobCard'
import PaywallModal from '@/components/PaywallModal'
import SkeletonLoader from '@/components/SkeletonLoader'
import { usePremium } from '@/contexts/PremiumContext'
import { useData } from '@/contexts/DataContext'

export default function JobsPage() {
  const { jobs } = useData()
  const { isPremium } = usePremium()
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(search.toLowerCase()) || job.company.toLowerCase().includes(search.toLowerCase())
      const matchesLocation = location ? job.location.toLowerCase().includes(location.toLowerCase()) : true
      const matchesCategory = category ? job.tags.some(tag => tag.toLowerCase().includes(category.toLowerCase())) : true
      return matchesSearch && matchesLocation && matchesCategory
    })
  }, [jobs, search, location, category])

  const freeJobs = filteredJobs.filter(j => !j.premium)
  const premiumJobs = filteredJobs.filter(j => j.premium)

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900">Browse Jobs</h1>
      <p className="mt-2 text-gray-600">Find your next opportunity in blue‑collar roles</p>

      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by title or company"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="sm:w-48 relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="sm:w-48 relative">
          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
          >
            <option value="">All Categories</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Skilled">Skilled</option>
            <option value="Remote">Remote</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonLoader key={i} />)}
        </div>
      ) : (
        <>
          {freeJobs.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Free Listings</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {freeJobs.map((job, idx) => (
                  <JobCard key={job.id} job={job} index={idx} />
                ))}
              </div>
            </div>
          )}

          {premiumJobs.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                Premium Listings
                {!isPremium && <span className="text-sm bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Locked</span>}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {premiumJobs.map((job, idx) => (
                  isPremium ? (
                    <JobCard key={job.id} job={job} index={idx} isPremium />
                  ) : (
                    <BlurredJobCard key={job.id} job={job} index={idx} onLockClick={() => setPaywallOpen(true)} />
                  )
                ))}
              </div>
            </div>
          )}

          {filteredJobs.length === 0 && (
            <div className="text-center py-16 text-gray-500">No jobs found. Try adjusting filters.</div>
          )}
        </>
      )}

      <PaywallModal isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  )
}
