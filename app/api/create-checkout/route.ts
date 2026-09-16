import { NextResponse } from 'next/server'
import { adminClient, getAuthedUser, readJson } from '@/lib/server'
import { getSiteSettings } from '@/lib/settings'
import { createCheckoutSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import { dodo, dodoEnvConfigured } from '@/lib/dodo'

/** Creates a Dodo hosted checkout session. The product comes from the
 *  DODO_PRODUCT_IDS env map (plan → pdt_ id, dashboard-managed); the price
 *  itself lives in the Dodo product — the site's site_settings price stays
 *  display-only for the cards, and the webhook's fulfillment check pins the
 *  expected paise from site_settings at order time. */
const productFor = (plan: string): string | undefined =>
  Object.fromEntries(
    (process.env.DODO_PRODUCT_IDS ?? '')
      .split(',')
      .map((pair) => pair.trim().split('=').map((s) => s.trim()))
      .filter((p) => p.length === 2 && p[0] && p[1]),
  )[plan]

export async function POST(req: Request) {
  const user = await getAuthedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`checkout:${user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }

  if (!dodoEnvConfigured()) {
    console.error('create-checkout: DODO_PAYMENTS_API_KEY missing')
    return NextResponse.json({ error: 'Payments are not configured right now. Try again later.' }, { status: 502 })
  }

  const parsed = createCheckoutSchema.safeParse(await readJson(req))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const { plan, referralCode } = parsed.data

  const productId = productFor(plan)
  if (!productId) {
    console.error(`create-checkout: no Dodo product id mapped for plan ${plan}`)
    return NextResponse.json({ error: 'This plan is not available right now. Try again.' }, { status: 502 })
  }

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

  const origin = new URL(req.url).origin
  try {
    // Order-time price pin: the site_settings paise rides in metadata so the
    // webhook can compare what the customer actually paid against what the
    // site advertised when the session was created.
    const settings = await getSiteSettings()
    const session = await dodo<{ checkout_url: string; session_id: string }>('/checkouts', {
      method: 'POST',
      body: JSON.stringify({
        product_cart: [{ product_id: productId, quantity: 1 }],
        customer: { email: user.email ?? '', name: user.email?.split('@')[0] ?? 'Jobkar user' },
        // Hosted checkout collects the billing address itself — no billing
        // object needed for an unconfirmed session.
        return_url: `${origin}/pricing`,
        cancel_url: `${origin}/pricing`,
        metadata: {
          userId: user.id,
          plan,
          referralCode: validReferral,
          expectedAmount: String(settings.prices[plan]),
        },
      }),
    })
    if (!session.checkout_url) {
      console.error('create-checkout: Dodo returned no checkout_url', session)
      return NextResponse.json({ error: 'Could not start checkout. Try again.' }, { status: 502 })
    }
    return NextResponse.json({ checkout_url: session.checkout_url, session_id: session.session_id })
  } catch (err) {
    console.error('Dodo checkout session creation failed:', err)
    return NextResponse.json({ error: 'Could not start checkout. Try again.' }, { status: 502 })
  }
}
