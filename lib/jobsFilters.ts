import type { ApiJob } from '@/lib/jobRedaction'
import {
  EXP_BUCKETS, POSTED_DAYS, SALARY_BUCKETS, SORTS,
  type ExpBucket, type SalaryBucket, type SortKey,
} from '@/lib/searchTokens'

export type Tier = 'all' | 'free' | 'premium' | 'saved'

export interface JobFilters {
  search: string
  location: string
  tag: string
  tier: Tier
  salary: SalaryBucket | ''
  exp: ExpBucket | ''
  posted: string
  sort: SortKey | ''
}

export const DEFAULT_FILTERS: JobFilters = {
  search: '', location: '', tag: '', tier: 'all',
  salary: '', exp: '', posted: '', sort: '',
}

const TIERS: readonly Tier[] = ['all', 'free', 'premium', 'saved']
const SALARY_KEYS = Object.keys(SALARY_BUCKETS)
const EXP_KEYS = Object.keys(EXP_BUCKETS)

/** Read filter state from a URL query string; unknown/garbage values fall
 *  back to defaults. Accepts legacy `search`/`category` param names. Shared
 *  URLs must never hard-error the feed, so every param is whitelist-checked. */
export function filtersFromParams(query: string): JobFilters {
  const p = new URLSearchParams(query)
  const tier = p.get('tier')
  const salary = p.get('salary') ?? ''
  const exp = p.get('exp') ?? ''
  const posted = p.get('posted') ?? ''
  const sort = p.get('sort') ?? ''
  return {
    search: (p.get('q') ?? p.get('search') ?? '').slice(0, 100),
    location: (p.get('location') ?? '').slice(0, 100),
    tag: (p.get('tag') ?? p.get('category') ?? '').slice(0, 50),
    tier: tier !== null && (TIERS as readonly string[]).includes(tier) ? (tier as Tier) : 'all',
    salary: (SALARY_KEYS as string[]).includes(salary) ? (salary as SalaryBucket) : '',
    exp: (EXP_KEYS as string[]).includes(exp) ? (exp as ExpBucket) : '',
    posted: (POSTED_DAYS as readonly string[]).includes(posted) ? posted : '',
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as SortKey) : '',
  }
}

/** Serialize filter state to query params; defaults are omitted so the URL
 *  stays clean when nothing is filtered. */
export function filtersToParams(f: JobFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.search) p.set('q', f.search)
  if (f.location) p.set('location', f.location)
  if (f.tag) p.set('tag', f.tag)
  if (f.tier !== 'all') p.set('tier', f.tier)
  if (f.salary) p.set('salary', f.salary)
  if (f.exp) p.set('exp', f.exp)
  if (f.posted) p.set('posted', f.posted)
  if (f.sort) p.set('sort', f.sort)
  return p
}

/** Params for the /api/jobs fetch: the URL params minus tier=saved — Saved
 *  is a client-side tier over server-filtered results, the API has no such
 *  value (it would 400). */
export function apiParams(f: JobFilters, page: number): URLSearchParams {
  const p = filtersToParams(f)
  if (f.tier === 'saved') p.delete('tier')
  p.set('page', String(page))
  return p
}

export function filtersActive(f: JobFilters): boolean {
  return Boolean(
    f.search || f.location || f.tag || f.salary || f.exp || f.posted || f.sort ||
    f.tier !== 'all',
  )
}

/** Client-side residual filtering: tier entitlement + locally-saved only.
 *  Everything else (search, location, tag, salary, experience, posted) is
 *  applied server-side by the search_jobs RPC. */
export function filterJobs(
  jobs: ApiJob[],
  f: JobFilters,
  savedIds: ReadonlySet<string>,
): ApiJob[] {
  return jobs.filter((job) => {
    if (f.tier === 'free' && job.is_premium) return false
    if (f.tier === 'premium' && !job.is_premium) return false
    if (f.tier === 'saved' && !savedIds.has(job.id)) return false
    return true
  })
}

export interface ParsedSalary {
  min: number
  max: number
  unitText: 'MONTH' | 'YEAR'
}

/** Tolerant parser for free-text Indian salary strings.
 *  "₹18,000 - ₹22,000" → {18000, 22000, MONTH}; "₹4.5 LPA" → {450000, YEAR};
 *  "20000" → {20000, 20000, MONTH}; null when nothing numeric. */
export function parseSalaryRange(text: string | null | undefined): ParsedSalary | null {
  if (!text) return null
  const lpa = text.match(/([\d.]+)\s*(?:lpa|lakh|lakhs)/i)
  if (lpa) {
    const v = Math.round(parseFloat(lpa[1]) * 100000)
    if (Number.isFinite(v) && v > 0) return { min: v, max: v, unitText: 'YEAR' }
  }
  const nums = (text.match(/[\d,]+(?:\.\d+)?/g) ?? [])
    .map((s) => Number(s.replace(/,/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0)
  if (!nums.length) return null
  return { min: Math.min(...nums), max: Math.max(...nums), unitText: 'MONTH' }
}
