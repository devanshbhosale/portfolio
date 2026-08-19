'use client'
import { useCallback, useEffect, useState } from 'react'
import { Search, MapPin, Briefcase, AlertCircle } from 'lucide-react'
import JobCard from '@/components/JobCard'
import BlurredJobCard from '@/components/BlurredJobCard'
import PaywallModal from '@/components/PaywallModal'
import SkeletonLoader from '@/components/SkeletonLoader'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { PublicJob } from '@/lib/database.types'

const PAGE_SIZE = 9

export default function JobsPage() {
  const { user } = useAuth()
  const isPremium = Boolean(user?.premium)

  const [jobs, setJobs] = useState<PublicJob[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')

  const load = useCallback(async (from: number, replace: boolean) => {
    let query = supabase
      .from('public_jobs')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('approved_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (replace && from === 0) query = query.limit(PAGE_SIZE)
    const { data, error: err } = await query
    if (err) {
      setError('Could not load jobs. Please retry.')
      return false
    }
    const rows = (data ?? []) as PublicJob[]
    setJobs((prev) => (replace ? rows : [...prev, ...rows]))
    setHasMore(rows.length === PAGE_SIZE)
    setError(null)
    return true
  }, [])

  useEffect(() => {
    setLoading(true)
    load(0, true).finally(() => setLoading(false))
  }, [load])

  // Live sync: silently refetch when the desktop dashboard bumps jobs_version.
  useEffect(() => {
    const channel = supabase
      .channel('jobs-version-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs_version' }, () => {
        load(0, true)
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  const loadMore = async () => {
    setLoadingMore(true)
    await load(jobs.length, false)
    setLoadingMore(false)
  }

  const filteredJobs = jobs.filter((job) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !q || job.title.toLowerCase().includes(q) || job.company.toLowerCase().includes(q)
    const matchesLocation = !location || (job.location ?? '').toLowerCase().includes(location.toLowerCase())
    const matchesCategory = !category || (job.tags ?? []).some((tag) => tag.toLowerCase().includes(category.toLowerCase()))
    return matchesSearch && matchesLocation && matchesCategory
  })

  const freeJobs = filteredJobs.filter((j) => !j.is_premium)
  const premiumJobs = filteredJobs.filter((j) => j.is_premium)

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900">Browse Jobs</h1>
      <p className="mt-2 text-gray-600">Find your next opportunity in blue‑collar roles</p>

      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} aria-hidden />
          <label htmlFor="job-search" className="sr-only">Search by title or company</label>
          <input
            id="job-search"
            type="search"
            placeholder="Search by title or company"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="sm:w-48 relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} aria-hidden />
          <label htmlFor="job-location" className="sr-only">Location</label>
          <input
            id="job-location"
            type="search"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="sm:w-48 relative">
          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} aria-hidden />
          <label htmlFor="job-category" className="sr-only">Category</label>
          <select
            id="job-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
          >
            <option value="">All Categories</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Skilled">Skilled</option>
            <option value="Remote">Remote</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="mt-8 flex flex-col items-center gap-3 py-12 text-center">
          <AlertCircle size={28} className="text-red-500" aria-hidden />
          <p className="text-gray-700">{error}</p>
          <Button variant="outline" size="sm" onClick={() => { setError(null); setLoading(true); load(0, true).finally(() => setLoading(false)) }}>
            Retry
          </Button>
        </div>
      ) : loading ? (
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

          {!loading && filteredJobs.length === 0 && (
            <div className="text-center py-16 text-gray-500">No jobs found. Try adjusting filters.</div>
          )}

          {hasMore && !search && !location && !category && (
            <div className="text-center mt-10">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more jobs'}
              </Button>
            </div>
          )}
        </>
      )}

      <PaywallModal isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  )
}
