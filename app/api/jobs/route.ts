import { NextResponse } from 'next/server'
import { adminClient, getAuthedProfile, isPremiumActive } from '@/lib/server'
import { rateLimit } from '@/lib/rate-limit'
import { redactJob } from '@/lib/jobRedaction'
import { describeFilters, PAGE_SIZE, validateJobsParams } from '@/lib/jobsQuery'
import type { PublicJob } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** The only public job-list exit point. The DB view hands the server full
 *  rows; entitlement redaction HERE is the paywall. (Anon SELECT on
 *  public_jobs is revoked — this route is how browsers get jobs.) */
export async function GET(req: Request) {
  // ponytail: in-memory per-instance IP bucket (lib/rate-limit) — fine at
  // this traffic level; shared store only if abuse shows up in logs.
  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim()
  if (!rateLimit(`jobs:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const url = new URL(req.url)
  const parsed = validateJobsParams(Object.fromEntries(url.searchParams))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const filters = describeFilters(parsed.value)

  const unlocked = isPremiumActive(await getAuthedProfile())

  // Filters translate to PostgREST conditions BEFORE .range() — filtering
  // after pagination would short-circuit pages.
  let query = adminClient()
    .from('public_jobs')
    .select('*')
    .order('is_featured', { ascending: false })
    .order('approved_at', { ascending: false })
  if (filters.or) query = query.or(filters.or)
  if (filters.locationIlike) query = query.ilike('location', `%${filters.locationIlike}%`)
  if (filters.tagContains) query = query.contains('tags', [filters.tagContains])
  if (filters.premiumEq !== null) query = query.eq('is_premium', filters.premiumEq)
  query = query.range(parsed.value.page * PAGE_SIZE, parsed.value.page * PAGE_SIZE + PAGE_SIZE - 1)

  const { data, error } = await query
  if (error) {
    console.error('GET /api/jobs failed:', error.message)
    return NextResponse.json({ error: 'Could not load jobs' }, { status: 502 })
  }

  const rows = (data ?? []) as PublicJob[]
  return NextResponse.json({
    jobs: rows.map((j) => redactJob(j, unlocked)),
    hasMore: rows.length === PAGE_SIZE,
  })
}
