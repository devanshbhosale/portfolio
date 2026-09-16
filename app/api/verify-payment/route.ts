import { NextResponse } from 'next/server'
import { adminClient, getAuthedUser, isPremiumActive, readJson } from '@/lib/server'
import { verifyPaymentSchema } from '@/lib/validation'

/** Client-side confirmation endpoint: the UI polls this after the customer
 *  returns from Dodo's hosted checkout so premium unlocks without waiting
 *  for the webhook round-trip. The webhook remains the source of truth —
 *  this only READS. */
export async function POST(req: Request) {
  const user = await getAuthedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = verifyPaymentSchema.safeParse(await readJson(req))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  const { payment_id } = parsed.data

  // Plain eq() lookup — user-controlled strings are never interpolated into
  // a PostgREST filter (`.or()` would allow comma-separated disjuncts).
  const { data: purchase } = await adminClient()
    .from('premium_purchases')
    .select('id, user_id')
    .eq('payment_id', payment_id)
    .limit(1)
    .maybeSingle()

  if (!purchase || purchase.user_id !== user.id) {
    return NextResponse.json({ verified: false })
  }

  const { data: profile } = await adminClient()
    .from('profiles')
    .select('premium_expires_at')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ verified: isPremiumActive(profile) })
}
