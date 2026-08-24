// Query params for GET /api/jobs — shared by the route (validation +
// PostgREST translation) and the /jobs feed (page size).

export const PAGE_SIZE = 9

export interface JobsParams {
  tier: 'all' | 'free' | 'premium'
  q: string
  location: string
  tag: string
  page: number
}

type Validate = { ok: true; value: JobsParams } | { ok: false; error: string }

export function validateJobsParams(raw: Record<string, string | null | undefined>): Validate {
  const tier = raw.tier ?? 'all'
  if (tier !== 'all' && tier !== 'free' && tier !== 'premium') {
    return { ok: false, error: 'invalid tier' }
  }

  // q feeds a PostgREST `or=(…)` list — strip the characters that would
  // break out of the ilike patterns.
  const clean = (s: string | null | undefined, max: number) =>
    (s ?? '').replace(/[,()%]/g, ' ').trim().slice(0, max)

  const page = raw.page === undefined || raw.page === '' ? 0 : Number(raw.page)
  if (!Number.isInteger(page) || page < 0) return { ok: false, error: 'invalid page' }

  return {
    ok: true,
    value: { tier, q: clean(raw.q, 100), location: clean(raw.location, 100), tag: clean(raw.tag, 50), page },
  }
}

/** Declarative filter translation — applied BEFORE .range() so pagination
 *  never short-circuits on filtered-out rows. Pure data, unit-testable. */
export function describeFilters(p: JobsParams) {
  return {
    or: p.q ? `title.ilike.%${p.q}%,company.ilike.%${p.q}%` : null,
    locationIlike: p.location || null,
    tagContains: p.tag || null,
    premiumEq: p.tier === 'free' ? false : p.tier === 'premium' ? true : null,
  }
}
