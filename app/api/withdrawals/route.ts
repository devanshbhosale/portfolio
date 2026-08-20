import { NextResponse } from 'next/server'
import { createRouteClient, getAuthedProfile, readJson } from '@/lib/server'
// Session client: the operator read policy lets operators read all rows, jobseekers their own.
import { withdrawalSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import type { WithdrawalRequestRow } from '@/lib/database.types'

export async function POST(req: Request) {
  const profile = await getAuthedProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`withdraw:${profile.id}`, 3, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many withdrawal requests. Try again later.' }, { status: 429 })
  }

  const parsed = withdrawalSchema.safeParse(await readJson(req))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 })
  }
  const amount = Math.round(parsed.data.amount * 100) / 100

  // Transactional check+insert in the DB: locks the referrer's commission
  // rows, validates threshold/bank/balance, inserts the request.
  // MUST use the session client — request_withdrawal resolves auth.uid(),
  // which is NULL under the service-role key.
  const { error } = await createRouteClient().rpc('request_withdrawal', { p_amount: amount })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

export async function GET() {
  const profile = await getAuthedProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await createRouteClient()
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Could not load withdrawals' }, { status: 500 })

  return NextResponse.json(data satisfies WithdrawalRequestRow[])
}
