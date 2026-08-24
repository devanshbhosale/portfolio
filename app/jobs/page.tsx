'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, MapPin, Briefcase, AlertCircle, Heart } from 'lucide-react'
import JobCard from '@/components/JobCard'
import BlurredJobCard from '@/components/BlurredJobCard'
import PaywallModal from '@/components/PaywallModal'
import SaveHeart from '@/components/SaveHeart'
import SkeletonLoader from '@/components/SkeletonLoader'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  DEFAULT_FILTERS, filterJobs, filtersFromParams, filtersToParams,
  type JobFilters, type Tier,
} from '@/lib/jobsFilters'
import { isTeaser, type ApiJob } from '@/lib/jobRedaction'
import { PAGE_SIZE } from '@/lib/jobsQuery'
import { savedSet, toggleSaved } from '@/lib/savedJobs'
import type { PublicJob } from '@/lib/database.types'

const TIER_OPTIONS: { value: Tier; label: string; icon?: 'heart' }[] = [
  { value: 'all', label: 'All' },
  { value: 'free', label: 'Free' },
  { value: 'premium', label: 'Premium' },
  { value: 'saved', label: 'Saved', icon: 'heart' },
]

const isFullJob = (j: ApiJob): j is PublicJob => !isTeaser(j)

export default function JobsPage() {
  const { user } = useAuth()
  const isPremium = Boolean(user?.premium)

  const [jobs, setJobs] = useState<ApiJob[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [tags, setTags] = useState<string[]>([])
  const urlSynced = useRef(false)
  // Tier changes re-invoke load; a slower earlier response (e.g. the
  // unfiltered first render before the URL tier is applied) must never
  // overwrite a newer one — only the latest invocation writes state.
  const reqSeq = useRef(0)

  // All job data comes from /api/jobs — the server applies entitlement
  // redaction before anything reaches this browser.
  const load = useCallback(async (page: number, replace: boolean) => {
    const seq = ++reqSeq.current
    // Free/Premium tier filtering is server-side: with hundreds of jobs the
    // first page may not contain any premium rows, and client-side filtering
    // would then wrongly report "0 jobs match".
    const params = new URLSearchParams({ page: String(page) })
    if (filters.tier === 'premium') params.set('tier', 'premium')
    else if (filters.tier === 'free') params.set('tier', 'free')
    let res: Response
    try {
      res = await fetch(`/api/jobs?${params}`)
    } catch {
      if (seq !== reqSeq.current) return false
      setError('Could not load jobs. Please retry.')
      return false
    }
    if (seq !== reqSeq.current) return false // superseded by a newer load
    if (!res.ok) {
      setError('Could not load jobs. Please retry.')
      return false
    }
    const { jobs: rows, hasMore: more } = (await res.json()) as { jobs: ApiJob[]; hasMore: boolean }
    setJobs((prev) => (replace ? rows : [...prev, ...rows]))
    setHasMore(more && rows.length === PAGE_SIZE)
    setError(null)
    return true
  }, [filters.tier])

  // Initial state: filters from the URL (shareable /jobs?location=Mumbai&tier=premium),
  // saved-job ids from this browser, live tag list from the DB.
  useEffect(() => {
    setFilters(filtersFromParams(window.location.search))
    setSavedIds(savedSet(window.localStorage))
    supabase
      .from('public_tags')
      .select('tag')
      .order('tag')
      .then(({ data }) => {
        setTags(((data ?? []) as { tag: string }[]).map((r) => r.tag).filter(Boolean))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the URL in sync (replaceState — no history spam) as filters change.
  useEffect(() => {
    if (!urlSynced.current) {
      urlSynced.current = true
      return
    }
    const qs = filtersToParams(filters).toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [filters])

  // Initial feed load.
  useEffect(() => {
    setLoading(true)
    load(0, true).finally(() => setLoading(false))
  }, [load])

  // Live sync without a socket: silent refetch on tab focus + a 90s tick
  // that only fires while the tab is visible (budget phones, metered data).
  useEffect(() => {
    const onFocus = () => load(0, true)
    const onTick = () => {
      if (document.visibilityState === 'visible') load(0, true)
    }
    window.addEventListener('focus', onFocus)
    const timer = window.setInterval(onTick, 90_000)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.clearInterval(timer)
    }
  }, [load])

  const loadMore = async () => {
    setLoadingMore(true)
    await load(jobs.length / PAGE_SIZE, false)
    setLoadingMore(false)
  }

  const onHeartToggle = (jobId: string) => {
    setSavedIds(toggleSaved(window.localStorage, jobId))
  }

  const filteredJobs = filterJobs(jobs, filters, savedIds)

  // Free/Premium tiers are filtered server-side (load refetches), so Load
  // more stays available for them; only the client-only filters disable it.
  const clientFiltersActive =
    Boolean(filters.search || filters.location || filters.tag) || filters.tier === 'saved'

  const freeJobs = filteredJobs.filter((j) => !j.is_premium)
  const premiumJobs = filteredJobs.filter((j) => j.is_premium)

  const setTier = (tier: Tier) => setFilters((f) => ({ ...f, tier }))

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
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
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
            value={filters.location}
            onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="sm:w-48 relative">
          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} aria-hidden />
          <label htmlFor="job-category" className="sr-only">Category</label>
          <select
            id="job-category"
            value={filters.tag}
            onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
          >
            <option value="">All Categories</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5" role="group" aria-label="Filter by tier">
          {TIER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTier(opt.value)}
              aria-pressed={filters.tier === opt.value}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filters.tier === opt.value
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {opt.icon === 'heart' && <Heart size={13} aria-hidden />}
              {opt.label}
            </button>
          ))}
        </div>
        {!loading && !error && (
          <p className="text-sm text-gray-500" role="status">
            {filteredJobs.length} job{filteredJobs.length === 1 ? '' : 's'} match
          </p>
        )}
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
                  isFullJob(job) && (
                    <JobCard
                      key={job.id}
                      job={job}
                      index={idx}
                      action={<SaveHeart jobId={job.id} onToggle={onHeartToggle} />}
                    />
                  )
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
                  isFullJob(job) ? (
                    <JobCard
                      key={job.id}
                      job={job}
                      index={idx}
                      isPremium
                      action={<SaveHeart jobId={job.id} onToggle={onHeartToggle} />}
                    />
                  ) : (
                    <BlurredJobCard key={job.id} job={job} index={idx} onLockClick={() => setPaywallOpen(true)} />
                  )
                ))}
              </div>
            </div>
          )}

          {!loading && filteredJobs.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              {filters.tier === 'saved'
                ? 'No saved jobs yet — tap the ♥ on any listing to keep it here.'
                : 'No jobs found. Try adjusting filters.'}
            </div>
          )}

          {hasMore && !clientFiltersActive && (
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
