import { NextResponse } from 'next/server'
import { adminClient, getAuthedProfile, readJson } from '@/lib/server'
import { getSiteSettings } from '@/lib/settings'
import { withdrawalSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import type { PremiumPurchaseRow, WithdrawalRequestRow } from '@/lib/database.types'

const HOLDING_PERIOD_MS = 15 * 60 * 1000

/** Commission the referrer can actually spend right now: released
 *  commissions plus pending ones past the 15-minute holding period. */
export function availableCommission(purchases: Pick<PremiumPurchaseRow, 'commission_amount' | 'withdrawn_amount' | 'commission_status' | 'created_at'>[], now = Date.now()) {
  return purchases
    .filter(
      (p) =>
        (p.commission_status === 'available' ||
          (p.commission_status === 'pending' && now - new Date(p.created_at).getTime() >= HOLDING_PERIOD_MS)) &&
        p.commission_amount > p.withdrawn_amount,
    )
    .reduce((sum, p) => sum + (p.commission_amount - p.withdrawn_amount), 0)
}

export async function POST(req: Request) {
  const profile = await getAuthedProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`withdraw:${profile.id}`, 3, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many withdrawal requests. Try again later.' }, { status: 429 })
  }

  if (!profile.bank_account_number || !profile.bank_ifsc || !profile.bank_holder_name) {
    return NextResponse.json({ error: 'Connect your bank account first' }, { status: 400 })
  }

  const parsed = withdrawalSchema.safeParse(await readJson(req))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 })
  }
  const amount = Math.round(parsed.data.amount * 100) / 100

  const settings = await getSiteSettings()
  if (amount < settings.withdrawThreshold) {
    return NextResponse.json(
      { error: `Minimum withdrawal is ₹${settings.withdrawThreshold}` },
      { status: 400 },
    )
  }

  // Server-side balance math: available − already-pending withdrawals.
  const { data: purchases } = await adminClient()
    .from('premium_purchases')
    .select('commission_amount, withdrawn_amount, commission_status, created_at')
    .eq('referrer_user_id', profile.id)
  const { data: pending } = await adminClient()
    .from('withdrawal_requests')
    .select('amount')
    .eq('user_id', profile.id)
    .eq('status', 'pending')

  const available = availableCommission(purchases ?? [])
  const pendingTotal = (pending ?? []).reduce((s, w) => s + w.amount, 0)
  if (amount > available - pendingTotal + 0.001) {
    return NextResponse.json(
      { error: `Insufficient balance. Available: ₹${(available - pendingTotal).toFixed(2)}` },
      { status: 400 },
    )
  }

  const { error } = await adminClient().from('withdrawal_requests').insert({
    user_id: profile.id,
    amount,
    bank_holder_name: profile.bank_holder_name,
    bank_account_number: profile.bank_account_number,
    bank_ifsc: profile.bank_ifsc,
  })
  if (error) {
    console.error('Withdrawal insert failed:', error)
    return NextResponse.json({ error: 'Could not submit request' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function GET() {
  const profile = await getAuthedProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await adminClient()
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Could not load withdrawals' }, { status: 500 })

  return NextResponse.json(data satisfies WithdrawalRequestRow[])
}
