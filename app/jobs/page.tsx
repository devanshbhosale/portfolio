'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, MapPin, Briefcase, AlertCircle, Heart, X } from 'lucide-react'
import JobCard from '@/components/JobCard'
import BlurredJobCard from '@/components/BlurredJobCard'
import PaywallModal from '@/components/PaywallModal'
import SaveHeart from '@/components/SaveHeart'
import SkeletonLoader from '@/components/SkeletonLoader'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  DEFAULT_FILTERS, apiParams, filterJobs, filtersFromParams, filtersToParams,
  type JobFilters, type Tier,
} from '@/lib/jobsFilters'
import { isTeaser, type ApiJob } from '@/lib/jobRedaction'
import { rupees } from '@/lib/plans'
import { PAGE_SIZE, type SearchFacets } from '@/lib/jobsQuery'
import { savedSet, toggleSaved } from '@/lib/savedJobs'
import type { PublicJob } from '@/lib/database.types'

const TIER_OPTIONS: { value: Tier; label: string; icon?: 'heart' }[] = [
  { value: 'all', label: 'All' },
  { value: 'free', label: 'Free' },
  { value: 'premium', label: 'Premium' },
  { value: 'saved', label: 'Saved', icon: 'heart' },
]

const SALARY_OPTIONS = [
  { value: 'under20k', label: 'Under ₹20k' },
  { value: 'to35k', label: '₹20k – ₹35k' },
  { value: 'over35k', label: '₹35k+' },
] as const
const EXP_OPTIONS = [
  { value: 'fresher', label: 'Fresher' },
  { value: 'oneToTwo', label: '0–2 years' },
  { value: 'twoToFive', label: '2–5 years' },
  { value: 'fivePlus', label: '5+ years' },
] as const
const POSTED_OPTIONS = [
  { value: '1', label: '24 hours' },
  { value: '3', label: '3 days' },
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
] as const
const SORT_OPTIONS = [
  { value: 'default', label: 'Best match' },
  { value: 'newest', label: 'Newest first' },
  { value: 'salary', label: 'Salary: high to low' },
] as const
const SALARY_LABELS = Object.fromEntries(SALARY_OPTIONS.map((o) => [o.value, o.label]))
const EXP_LABELS = Object.fromEntries(EXP_OPTIONS.map((o) => [o.value, o.label]))
const POSTED_LABELS = Object.fromEntries(POSTED_OPTIONS.map((o) => [o.value, o.label]))
const SORT_LABELS = Object.fromEntries(SORT_OPTIONS.map((o) => [o.value, o.label]))

const RECENTS_KEY = 'jobkar:recent-searches'

function readRecents(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(RECENTS_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

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
  const [unlockFrom, setUnlockFrom] = useState<number | null>(null)
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [tags, setTags] = useState<string[]>([])
  // Server-reported truth: match count, facet counts, did-you-mean.
  const [total, setTotal] = useState(0)
  const [facets, setFacets] = useState<SearchFacets | null>(null)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [recents, setRecents] = useState<string[]>([])
  const [recentsOpen, setRecentsOpen] = useState(false)
  const urlSynced = useRef(false)
  // Tier changes re-invoke load; a slower earlier response (e.g. the
  // unfiltered first render before the URL filters are applied) must never
  // overwrite a newer one — only the latest invocation writes state.
  const reqSeq = useRef(0)

  // All job data comes from /api/jobs — the server applies entitlement
  // redaction before anything reaches this browser.
  const load = useCallback(async (page: number, replace: boolean) => {
    const seq = ++reqSeq.current
    let res: Response
    try {
      res = await fetch(`/api/jobs?${apiParams(filters, page)}`)
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
    const data = (await res.json()) as {
      jobs: ApiJob[]
      hasMore: boolean
      total: number
      facets?: SearchFacets
      suggestion?: string
    }
    setJobs((prev) => (replace ? data.jobs : [...prev, ...data.jobs]))
    setHasMore(data.hasMore && data.jobs.length === PAGE_SIZE)
    setTotal(typeof data.total === 'number' ? data.total : data.jobs.length)
    setFacets(data.facets ?? null)
    setSuggestion(data.suggestion ?? null)
    setError(null)
    // Remember successful searches (dedup, newest first, max 5). Storage can
    // be blocked (private mode) — search must keep working without it.
    if (page === 0 && replace && data.total > 0 && filters.search.trim()) {
      try {
        const q = filters.search.trim()
        const next = [q, ...readRecents().filter((r) => r !== q)].slice(0, 5)
        window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
        setRecents(next)
      } catch {
        // storage blocked — recents are a convenience, not a feature
      }
    }
    return true
  }, [filters])

  // Initial state: filters from the URL (shareable /jobs?location=Mumbai&salary=under20k),
  // saved-job ids from this browser, live tag list from the DB, recent searches local.
  useEffect(() => {
    setFilters(filtersFromParams(window.location.search))
    setSavedIds(savedSet(window.localStorage))
    setRecents(readRecents())
    supabase
      .from('public_tags')
      .select('tag')
      .order('tag')
      .then(({ data }) => {
        setTags(((data ?? []) as { tag: string }[]).map((r) => r.tag).filter(Boolean))
      })
    // Locked-card CTA price — one shot here; the focus/90s refetches don't need it.
    // Unknown stays null → the card shows plain "Unlock" (never a wrong price).
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { prices?: { Weekly?: unknown } } | null) => {
        if (typeof s?.prices?.Weekly === 'number') setUnlockFrom(Math.round(rupees(s.prices.Weekly)))
      })
      .catch(() => {
        // leave null
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

  // Debounced feed load: 300ms after the last filter change, then page 0.
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true)
      load(0, true).finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
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
  const matchCount = filters.tier === 'saved' ? filteredJobs.length : total

  const setFilter = (key: keyof JobFilters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }) as JobFilters)

  // Active server-side filters as removable chips (tier stays a control, not a chip).
  const chips = (['search', 'location', 'tag', 'salary', 'exp', 'posted', 'sort'] as const)
    .filter((key) => filters[key])
    .map((key) => ({
      key,
      label:
        key === 'search' ? `“${filters.search}”`
        : key === 'salary' ? SALARY_LABELS[filters.salary as keyof typeof SALARY_LABELS]
        : key === 'exp' ? EXP_LABELS[filters.exp as keyof typeof EXP_LABELS]
        : key === 'posted' ? POSTED_LABELS[filters.posted]
        : key === 'sort' ? SORT_LABELS[filters.sort as keyof typeof SORT_LABELS]
        : String(filters[key]),
    }))

  const freeJobs = filteredJobs.filter((j) => !j.is_premium)
  const premiumJobs = filteredJobs.filter((j) => j.is_premium)
  // Facets are computed over the (possibly empty) result set — fall back to
  // the global tag list so empty-state suggestions still show something.
  const emptyStateTags = facets?.tags.length
    ? facets.tags.slice(0, 5)
    : tags.slice(0, 5).map((t) => ({ value: t, count: 0 }))

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
            onChange={(e) => setFilter('search', e.target.value)}
            onFocus={() => setRecentsOpen(true)}
            onBlur={() => setRecentsOpen(false)}
            autoComplete="off"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {recentsOpen && filters.search === '' && recents.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1">
              <p className="px-3 pt-1 pb-0.5 text-xs text-gray-400">Recent searches</p>
              {recents.map((r) => (
                <button
                  key={r}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setFilter('search', r)
                    setRecentsOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="sm:w-48 relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} aria-hidden />
          <label htmlFor="job-location" className="sr-only">Location</label>
          <input
            id="job-location"
            type="search"
            placeholder="Location"
            value={filters.location}
            onChange={(e) => setFilter('location', e.target.value)}
            list="location-suggestions"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <datalist id="location-suggestions">
            {(facets?.locations ?? []).map((l) => (
              <option key={l.value} value={l.value}>{l.value} ({l.count})</option>
            ))}
          </datalist>
        </div>
        <div className="sm:w-48 relative">
          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} aria-hidden />
          <label htmlFor="job-category" className="sr-only">Category</label>
          <select
            id="job-category"
            value={filters.tag}
            onChange={(e) => setFilter('tag', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
          >
            <option value="">All Categories</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label htmlFor="job-posted" className="sr-only">Posted within</label>
          <select
            id="job-posted"
            value={filters.posted}
            onChange={(e) => setFilter('posted', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">Posted: anytime</option>
            {POSTED_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="job-exp" className="sr-only">Experience</label>
          <select
            id="job-exp"
            value={filters.exp}
            onChange={(e) => setFilter('exp', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">Experience: any</option>
            {EXP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}{facets?.experience[o.value as keyof typeof facets.experience] !== undefined
                  ? ` (${facets?.experience[o.value as keyof typeof facets.experience]})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="job-salary" className="sr-only">Monthly salary</label>
          <select
            id="job-salary"
            value={filters.salary}
            onChange={(e) => setFilter('salary', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">Salary: any</option>
            {SALARY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}{facets?.salary[o.value as keyof typeof facets.salary] !== undefined
                  ? ` (${facets?.salary[o.value as keyof typeof facets.salary]})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="job-sort" className="sr-only">Sort</label>
          <select
            id="job-sort"
            value={filters.sort || 'default'}
            onChange={(e) => setFilter('sort', e.target.value === 'default' ? '' : e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5" role="group" aria-label="Filter by tier">
          {TIER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter('tier', opt.value)}
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
            {matchCount} job{matchCount === 1 ? '' : 's'} match
          </p>
        )}
      </div>

      {chips.length > 0 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(c.key, '')}
              className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 border border-primary-200 rounded-full pl-3 pr-1.5 py-1 text-sm hover:bg-primary-100"
              aria-label={`Remove filter ${c.label}`}
            >
              {c.label}
              <X size={13} aria-hidden />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            Clear all
          </button>
        </div>
      )}

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
                    <BlurredJobCard
                      key={job.id}
                      job={job}
                      index={idx}
                      unlockFrom={unlockFrom ?? undefined}
                      onLockClick={() => setPaywallOpen(true)}
                    />
                  )
                ))}
              </div>
            </div>
          )}

          {filteredJobs.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              {filters.tier === 'saved' ? (
                'No saved jobs yet — tap the ♥ on any listing to keep it here.'
              ) : (
                <>
                  <p>No jobs found. Try adjusting filters.</p>
                  {suggestion && (
                    <button
                      type="button"
                      onClick={() => setFilter('search', suggestion)}
                      className="mt-3 inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 underline"
                    >
                      Did you mean “{suggestion}”?
                    </button>
                  )}
                  {emptyStateTags.length > 0 && (
                    <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-400">Popular:</span>
                      {emptyStateTags.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setFilter('tag', t.value)}
                          className="text-sm border border-gray-300 rounded-full px-3 py-1 text-gray-600 hover:border-primary-400 hover:text-primary-600"
                        >
                          {t.value}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {hasMore && (
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
