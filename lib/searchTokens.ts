// Smart Search token pipeline — pure functions deciding WHAT the search_jobs
// RPC receives. Text matching happens in SQL; this file shapes the inputs.

export const MAX_TOKENS = 6
export const MAX_TOKEN_LEN = 30
export const MAX_QUERY_LEN = 100

/** Stripped before matching. The RPC is parameter-bound (no injection risk) —
 *  these strips are matching-correctness: % and _ are ILIKE wildcards, the
 *  rest are word-splitters ("driver, mumbai" → two tokens). */
const STRIP_RE = /[,()%"'\\_]/g

/** Spelling/region alias groups: every member expands to all siblings as one
 *  OR-group on the location field. Covers typos ("banglore") and alternate
 *  spellings ("bengaluru"). "fresher" deliberately stays a plain text token —
 *  descriptions contain the word, so no alias is needed. */
const LOCATION_GROUPS: string[][] = [
  ['bangalore', 'bengaluru', 'banglore'],
  ['gurgaon', 'gurugram'],
  ['delhi', 'new delhi', 'ncr'],
  ['wfh', 'remote', 'work from home'],
]

const LOCATION_INDEX = new Map<string, string[]>(
  LOCATION_GROUPS.flatMap((g) => g.map((word) => [word, g] as const)),
)

export interface TokenizedQuery {
  /** Text-search tokens (AND across tokens in the RPC). */
  tokens: string[]
  /** Location words typed into the q box, routed to the location OR-group. */
  locationVariants: string[]
}

/** Tokenize a free-text search: lowercase, strip ILIKE-breaking characters,
 *  ≤6 tokens of ≤30 chars (overlong words dropped), ≤100 chars total.
 *  Words that are known location aliases become location OR-variants instead
 *  of text tokens — "driver banglore" searches "driver" AND loc~Bengaluru. */
export function tokenizeQuery(q: string): TokenizedQuery {
  const clean = (q ?? '').toLowerCase().replace(STRIP_RE, ' ').trim().slice(0, MAX_QUERY_LEN)
  const tokens: string[] = []
  const locationVariants: string[] = []
  for (const word of clean.split(/\s+/).filter(Boolean)) {
    if (word.length > MAX_TOKEN_LEN) continue
    const group = LOCATION_INDEX.get(word)
    if (group) {
      for (const v of group) if (!locationVariants.includes(v)) locationVariants.push(v)
    } else if (!tokens.includes(word) && tokens.length < MAX_TOKENS) {
      tokens.push(word)
    }
  }
  return { tokens, locationVariants }
}

/** Expand a location-input value into the RPC's location OR-group. */
export function locationVariants(location: string): string[] {
  const clean = (location ?? '').toLowerCase().replace(STRIP_RE, ' ').trim().slice(0, MAX_QUERY_LEN)
  if (!clean) return []
  const group = LOCATION_INDEX.get(clean)
  return group ? [...group] : [clean]
}

/** Monthly-salary buckets (rupees). Open ends: lower=0, upper=null. */
export const SALARY_BUCKETS = {
  under20k: { min: 0, max: 20000 },
  to35k: { min: 20000, max: 35000 },
  over35k: { min: 35000, max: null },
} as const
export type SalaryBucket = keyof typeof SALARY_BUCKETS

/** Experience buckets in months (overlaps at exact edges are deliberate). */
export const EXP_BUCKETS = {
  fresher: { min: 0, max: 12 },
  oneToTwo: { min: 0, max: 24 },
  twoToFive: { min: 24, max: 60 },
  fivePlus: { min: 60, max: null },
} as const
export type ExpBucket = keyof typeof EXP_BUCKETS

export const POSTED_DAYS = ['1', '3', '7', '30'] as const
export type PostedDays = (typeof POSTED_DAYS)[number]

export const SORTS = ['default', 'newest', 'salary'] as const
export type SortKey = (typeof SORTS)[number]
