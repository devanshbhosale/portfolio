import type { PublicJob } from './database.types'

/** Wall-clock reads isolated here so component render paths stay free of
 *  direct impure calls (react-hooks/purity). Semantics unchanged: server
 *  components re-read per request, client components re-read per render.
 *  If the React Compiler is ever enabled, audit these call sites first —
 *  memoization would freeze these values. */

export function nowMs(): number {
  return Date.now()
}

/** ISO timestamp exactly 7 days ago — the fresh-jobs cutoff. */
export function weekAgoIso(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
}

/** Featured badge: featured_until still in the future (unset = always). */
export function isFeaturedNow(job: Pick<PublicJob, 'is_featured' | 'featured_until'>): boolean {
  return Boolean(job.is_featured && (!job.featured_until || new Date(job.featured_until).getTime() > Date.now()))
}
