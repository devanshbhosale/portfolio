import { NextResponse } from 'next/server'
import { adminClient, getAuthedProfile, readJson } from '@/lib/server'
import { getSiteSettings } from '@/lib/settings'
import { renewJobSchema } from '@/lib/validation'

/** Agent renews one of their own approved jobs: expiry = now + TTL. */
export async function POST(req: Request) {
  const profile = await getAuthedProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== 'agent' && profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = renewJobSchema.safeParse(await readJson(req))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid job id' }, { status: 400 })
  }

  const { data: job } = await adminClient()
    .from('job_listings')
    .select('id, status, agent_id')
    .eq('id', parsed.data.jobId)
    .single()
  if (!job || job.agent_id !== profile.id) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }
  if (job.status !== 'approved') {
    return NextResponse.json({ error: 'Only approved jobs can be renewed' }, { status: 400 })
  }

  const settings = await getSiteSettings()
  const expiresAt = new Date(Date.now() + settings.jobTtlDays * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await adminClient()
    .from('job_listings')
    .update({ expires_at: expiresAt })
    .eq('id', parsed.data.jobId)
  if (error) {
    console.error('Job renewal failed:', error)
    return NextResponse.json({ error: 'Could not renew the job' }, { status: 500 })
  }

  return NextResponse.json({ success: true, expires_at: expiresAt })
}
