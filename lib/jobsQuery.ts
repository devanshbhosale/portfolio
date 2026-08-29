// Query params for GET /api/jobs — shared by the route (validation + RPC
// argument building) and the /jobs feed (page size).

import {
  EXP_BUCKETS, MAX_QUERY_LEN, POSTED_DAYS, SALARY_BUCKETS, SORTS,
  locationVariants, tokenizeQuery, type ExpBucket, type SalaryBucket,
  type SortKey,
} from './searchTokens'

export const PAGE_SIZE = 9

export interface JobsParams {
  tier: 'all' | 'free' | 'premium'
  q: string
  location: string
  tag: string
  salary: SalaryBucket | ''
  exp: ExpBucket | ''
  posted: string
  sort: SortKey | ''
  page: number
}

/** Facet counts computed by search_jobs over the current result set. */
export interface FacetCount { value: string; count: number }
export interface SearchFacets {
  tags: FacetCount[]
  locations: FacetCount[]
  experience: { fresher: number; oneToTwo: number; twoToFive: number; fivePlus: number }
  salary: { under20k: number; to35k: number; over35k: number }
}

type Validate = { ok: true; value: JobsParams } | { ok: false; error: string }

const SALARY_KEYS = Object.keys(SALARY_BUCKETS) as SalaryBucket[]
const EXP_KEYS = Object.keys(EXP_BUCKETS) as ExpBucket[]

export function validateJobsParams(raw: Record<string, string | null | undefined>): Validate {
  const tier = raw.tier ?? 'all'
  if (tier !== 'all' && tier !== 'free' && tier !== 'premium') {
    return { ok: false, error: 'invalid tier' }
  }

  // Matching-correctness strips (ILIKE wildcards etc.) happen again in the
  // tokenizer; here they keep stored/echoed params clean.
  const clean = (s: string | null | undefined, max: number) =>
    (s ?? '').replace(/[,()%"'\\_]/g, ' ').trim().slice(0, max)

  const salary = clean(raw.salary, 10) as SalaryBucket | ''
  if (salary && !SALARY_KEYS.includes(salary)) return { ok: false, error: 'invalid salary' }

  const exp = clean(raw.exp, 10) as ExpBucket | ''
  if (exp && !EXP_KEYS.includes(exp)) return { ok: false, error: 'invalid exp' }

  const posted = clean(raw.posted, 2)
  if (posted && !(POSTED_DAYS as readonly string[]).includes(posted)) {
    return { ok: false, error: 'invalid posted' }
  }

  const sort = clean(raw.sort, 10) as SortKey | ''
  if (sort && !(SORTS as readonly string[]).includes(sort)) {
    return { ok: false, error: 'invalid sort' }
  }

  const page = raw.page === undefined || raw.page === '' ? 0 : Number(raw.page)
  if (!Number.isInteger(page) || page < 0) return { ok: false, error: 'invalid page' }

  return {
    ok: true,
    value: {
      tier,
      q: clean(raw.q, MAX_QUERY_LEN),
      location: clean(raw.location, MAX_QUERY_LEN),
      tag: clean(raw.tag, 50),
      salary,
      exp,
      posted,
      sort,
      page,
    },
  }
}

/** Pure translation of validated params into search_jobs RPC arguments.
 *  Text matching is AND across tokens, OR across fields (SQL side); location
 *  words typed into q ("driver banglore") route into the location OR-group. */
export function buildSearchArgs(p: JobsParams): Record<string, unknown> {
  const { tokens, locationVariants: routed } = tokenizeQuery(p.q)
  const variants = [...new Set([...routed, ...locationVariants(p.location)])]
  const salary = p.salary ? SALARY_BUCKETS[p.salary] : null
  const exp = p.exp ? EXP_BUCKETS[p.exp] : null
  return {
    p_q_tokens: tokens,
    p_location_variants: variants,
    p_tag: p.tag || null,
    p_premium: p.tier === 'free' ? false : p.tier === 'premium' ? true : null,
    p_salary_min: salary ? salary.min : null,
    p_salary_max: salary ? salary.max : null,
    p_exp_min: exp ? exp.min : null,
    p_exp_max: exp ? exp.max : null,
    p_posted_days: p.posted ? Number(p.posted) : null,
    p_sort: p.sort || 'default',
    p_page: p.page,
    p_page_size: PAGE_SIZE,
  }
}
