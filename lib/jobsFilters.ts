import type { PublicJob } from '@/lib/database.types'

export type Tier = 'all' | 'free' | 'premium' | 'saved'

export interface JobFilters {
  search: string
  location: string
  tag: string
  tier: Tier
}

export const DEFAULT_FILTERS: JobFilters = { search: '', location: '', tag: '', tier: 'all' }

const TIERS: readonly Tier[] = ['all', 'free', 'premium', 'saved']

/** Read filter state from a URL query string; unknown/garbage values fall
 *  back to defaults. Accepts legacy `search`/`category` param names. */
export function filtersFromParams(query: string): JobFilters {
  const p = new URLSearchParams(query)
  const tier = p.get('tier')
  return {
    search: (p.get('q') ?? p.get('search') ?? '').slice(0, 100),
    location: (p.get('location') ?? '').slice(0, 100),
    tag: (p.get('tag') ?? p.get('category') ?? '').slice(0, 50),
    tier: tier !== null && (TIERS as readonly string[]).includes(tier) ? (tier as Tier) : 'all',
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
  return p
}

export function filtersActive(f: JobFilters): boolean {
  return Boolean(f.search || f.location || f.tag || f.tier !== 'all')
}

/** Exact case-insensitive tag match — tags come from public_tags, so the
 *  dropdown values are exactly what the DB holds. */
export function matchTag(jobTags: string[] | null | undefined, tag: string): boolean {
  if (!tag) return true
  const wanted = tag.trim().toLowerCase()
  return (jobTags ?? []).some((t) => t.trim().toLowerCase() === wanted)
}

export function filterJobs(
  jobs: PublicJob[],
  f: JobFilters,
  savedIds: ReadonlySet<string>,
): PublicJob[] {
  const q = f.search.trim().toLowerCase()
  const loc = f.location.trim().toLowerCase()
  return jobs.filter((job) => {
    if (q && !(job.title.toLowerCase().includes(q) || job.company.toLowerCase().includes(q))) return false
    if (loc && !(job.location ?? '').toLowerCase().includes(loc)) return false
    if (!matchTag(job.tags, f.tag)) return false
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
