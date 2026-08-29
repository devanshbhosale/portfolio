import { NextResponse } from 'next/server'
import { adminClient, getAuthedProfile, isPremiumActive } from '@/lib/server'
import { rateLimit } from '@/lib/rate-limit'
import { redactJob } from '@/lib/jobRedaction'
import { buildSearchArgs, PAGE_SIZE, validateJobsParams, type SearchFacets } from '@/lib/jobsQuery'
import type { PublicJob } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** The only public job-list exit point. The search_jobs RPC (service-role)
 *  does text/facet filtering over the public_jobs view; entitlement redaction
 *  HERE is the paywall. (Anon SELECT on public_jobs is revoked and the RPC is
 *  service_role-only — this route is how browsers get jobs.) */
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
  const params = parsed.value

  const unlocked = isPremiumActive(await getAuthedProfile())

  const { data, error } = await adminClient().rpc('search_jobs', buildSearchArgs(params))
  if (error) {
    console.error('GET /api/jobs failed:', error.message)
    return NextResponse.json({ error: 'Could not load jobs' }, { status: 502 })
  }
  const { jobs: rows, total, facets } = data as unknown as {
    jobs: PublicJob[]
    total: number
    facets: SearchFacets
  }

  // Zero hits on a text search → offer one trigram-similar correction.
  let suggestion: string | null = null
  if (total === 0 && params.q) {
    const { data: word } = await adminClient().rpc('suggest_job_query', { q: params.q })
    suggestion = (word as string | null) ?? null
  }

  return NextResponse.json({
    jobs: rows.map((j) => redactJob(j, unlocked)),
    hasMore: (params.page + 1) * PAGE_SIZE < total,
    total,
    facets,
    ...(suggestion ? { suggestion } : {}),
  })
}
