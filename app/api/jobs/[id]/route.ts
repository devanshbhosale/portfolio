import { NextResponse } from 'next/server'
import { adminClient, getAuthedProfile, isPremiumActive } from '@/lib/server'

/** Public job detail. contact_info is included for free listings and for
 *  currently-valid premium members only. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { id } = params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid job id' }, { status: 400 })
  }

  const { data: job, error } = await adminClient()
    .from('public_jobs')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  let contactInfo: string | null = null
  if (job.is_premium) {
    const profile = await getAuthedProfile()
    if (isPremiumActive(profile)) {
      const { data } = await adminClient()
        .from('job_listings')
        .select('contact_info')
        .eq('id', id)
        .single()
      contactInfo = data?.contact_info ?? null
    }
  } else {
    const { data } = await adminClient()
      .from('job_listings')
      .select('contact_info')
      .eq('id', id)
      .single()
    contactInfo = data?.contact_info ?? null
  }

  return NextResponse.json({ ...job, contact_info: contactInfo })
}
