import { NextResponse } from 'next/server'
import { adminClient, getAuthedProfile, readJson } from '@/lib/server'
import { getSiteSettings } from '@/lib/settings'
import { submitJobSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import type { JobListingRow } from '@/lib/database.types'

/** Agent job submission → pending_review. Duplicate source links are
 *  flagged in the response but still allowed. */
export async function POST(req: Request) {
  const profile = await getAuthedProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== 'agent' && profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!rateLimit(`submit:${profile.id}`, 20, 60 * 60_000)) {
    return NextResponse.json({ error: 'Submission limit reached. Try again later.' }, { status: 429 })
  }

  const parsed = submitJobSchema.safeParse(await readJson(req))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const input = parsed.data

  const settings = await getSiteSettings()
  const expiresAt = new Date(Date.now() + settings.jobTtlDays * 24 * 60 * 60 * 1000).toISOString()

  let duplicateWarning: string | null = null
  if (input.source_link) {
    const { data: dup } = await adminClient()
      .from('job_listings')
      .select('id, title')
      .eq('source_link', input.source_link)
      .limit(1)
    if (dup && dup.length > 0) {
      duplicateWarning = `Note: a job from this link already exists ("${dup[0].title}"). Submitted anyway for review.`
    }
  }

  const { data: job, error } = await adminClient()
    .from('job_listings')
    .insert({
      agent_id: profile.id,
      source_link: input.source_link || null,
      title: input.title,
      company: input.company,
      location: input.location || null,
      salary_range: input.salary_range || null,
      experience: input.experience || null,
      description: input.description || null,
      contact_info: input.contact_info || null,
      tags: input.tags,
      is_premium: input.is_premium,
      status: 'pending_review',
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (error || !job) {
    console.error('Job submission failed:', error)
    return NextResponse.json({ error: 'Could not submit the job' }, { status: 500 })
  }

  return NextResponse.json({ success: true, job: job satisfies JobListingRow, warning: duplicateWarning })
}
