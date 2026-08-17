import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { adminClient, getAuthedUser, readJson } from '@/lib/server'
import { getSiteSettings } from '@/lib/settings'
import { createOrderSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'

/** Creates a Razorpay order. The amount ALWAYS comes from server-side
 *  site_settings — never from the request body. */
export async function POST(req: Request) {
  const user = await getAuthedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`order:${user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }

  const parsed = createOrderSchema.safeParse(await readJson(req))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const { plan, referralCode } = parsed.data

  const settings = await getSiteSettings()
  const amount = settings.prices[plan]

  let validReferral = ''
  if (referralCode) {
    const { data: referrer } = await adminClient()
      .from('profiles')
      .select('id')
      .eq('referral_code', referralCode)
      .single()
    if (!referrer) {
      return NextResponse.json({ error: 'Referral code not found' }, { status: 400 })
    }
    if (referrer.id === user.id) {
      return NextResponse.json({ error: 'You cannot use your own referral code' }, { status: 400 })
    }
    validReferral = referralCode
  }

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `r_${user.id}_${Date.now()}`.slice(0, 40),
      notes: { userId: user.id, plan, orderAmount: amount, referralCode: validReferral },
    })
    return NextResponse.json({ id: order.id, amount: order.amount, currency: order.currency })
  } catch (err) {
    console.error('Razorpay order creation failed:', err)
    return NextResponse.json({ error: 'Could not create payment order. Try again.' }, { status: 502 })
  }
}
