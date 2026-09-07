import { NextResponse } from 'next/server'
import { createRouteClient, getAuthedProfile, readJson } from '@/lib/server'
import { reportSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const profile = await getAuthedProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`report:${profile.id}`, 10, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many reports. Try again later.' }, { status: 429 })
  }

  const parsed = reportSchema.safeParse(await readJson(req))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid report' }, { status: 400 })
  }

  // Session client + RLS insert-own policy — the same pattern as job_marks.
  const { error } = await createRouteClient().from('reports').insert({
    user_id: profile.id,
    job_id: parsed.data.jobId,
    reason: parsed.data.reason,
    note: parsed.data.note ?? null,
  })
  if (error) {
    // Surface server-side: a misapplied RLS policy or revoked grant would
    // otherwise fail silently while the user retries forever.
    console.error('report insert failed', { userId: profile.id, jobId: parsed.data.jobId, error })
    return NextResponse.json({ error: 'Could not submit report' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
