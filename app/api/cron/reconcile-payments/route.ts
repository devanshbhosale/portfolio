import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import Razorpay from 'razorpay'
import { adminClient } from '@/lib/server'
import { classifyPayments, windowFromEpoch, type PaymentLike } from '@/lib/reconcilePayments'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/** Payment self-heal. If the Razorpay webhook is dropped (the 2026-08-21
 *  incident: checkout said "Payment Successful", premium never activated),
 *  nothing replays it — purchases are only written at fulfillment. This cron
 *  lists recent payments straight from Razorpay and replays each captured
 *  one through the idempotent process_payment RPC ('duplicate' is success).
 *  Scheduled daily at 06:00 with a 7-day window (Hobby plan allows only
 *  once-daily crons) — a dropped webhook heals within ≤24h. For 15-min
 *  recovery, point a free external pinger (e.g. cron-job.org) at this path
 *  with the CRON_SECRET bearer header; the route itself is unchanged. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  const expected = secret ? `Bearer ${secret}` : null
  const ok =
    expected !== null &&
    auth !== null &&
    auth.length === expected.length &&
    timingSafeEqual(Buffer.from(auth), Buffer.from(expected))
  if (!ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const days = Math.min(7, Math.max(1, Number(url.searchParams.get('days')) || 1))
  const from = windowFromEpoch(Math.floor(Date.now() / 1000), days)

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })

  // ponytail: page cap 10×100 — this volume is far below it; raise only if
  // a 7-day window ever exceeds 1000 payments.
  const payments: PaymentLike[] = []
  for (let page = 0; page < 10; page++) {
    const res = (await razorpay.payments.all({
      from,
      count: 100,
      skip: page * 100,
    })) as unknown as { items: PaymentLike[] }
    const items = res.items ?? []
    payments.push(...items)
    if (items.length < 100) break
  }

  const { toProcess, skipped } = classifyPayments(payments)
  let healed = 0
  let duplicates = 0
  const errors: { id: string; message: string }[] = []
  for (const c of toProcess) {
    const { data, error } = await adminClient().rpc('process_payment', {
      p_user_id: c.p_user_id,
      p_plan: c.p_plan,
      p_amount: c.p_amount,
      p_payment_id: c.p_payment_id,
      p_order_id: c.p_order_id,
      p_referral_code: c.p_referral_code,
      p_expected_paise: c.p_expected_paise,
    })
    if (error) {
      errors.push({ id: c.p_payment_id, message: error.message })
      continue
    }
    if ((data as { status?: string } | null)?.status === 'duplicate') duplicates += 1
    else healed += 1
  }

  console.log(
    `[reconcile] window=${days}d checked=${payments.length} healed=${healed} ` +
      `dup=${duplicates} skipped=${skipped.length} errors=${errors.length}`,
  )
  return NextResponse.json({
    window_days: days,
    checked: payments.length,
    healed,
    duplicates,
    skipped,
    errors,
  })
}
