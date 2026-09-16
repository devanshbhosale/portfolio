import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { adminClient } from '@/lib/server'
import { classifyPayments, windowFromIso, type PaymentLike } from '@/lib/reconcilePayments'
import { dodo } from '@/lib/dodo'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/** Payment self-heal. If the Dodo webhook is dropped, nothing replays it —
 *  purchases are only written at fulfillment. This cron lists recent
 *  payments straight from Dodo and replays each succeeded one through the
 *  idempotent process_payment RPC ('duplicate' is success). Scheduled daily
 *  at 06:00 with a 7-day window (Hobby plan allows only once-daily crons) —
 *  a dropped webhook heals within ≤24h. For 15-min recovery, point a free
 *  external pinger (e.g. cron-job.org) at this path with the CRON_SECRET
 *  bearer header; the route itself is unchanged. */
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
  const from = windowFromIso(Date.now(), days)

  // ponytail: page cap 10×100 — this volume is far below it; raise only if
  // a 7-day window ever exceeds 1000 payments.
  const payments: PaymentLike[] = []
  for (let page = 0; page < 10; page++) {
    const res = await dodo<{ items: PaymentLike[] }>(
      `/payments?created_at_gte=${encodeURIComponent(from)}&page_size=100&page_number=${page}`,
    )
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
