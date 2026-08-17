import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/server'

export const maxDuration = 60

/** Vercel Cron calls with `Authorization: Bearer $CRON_SECRET` when the
 *  CRON_SECRET env var is set. The 15-minute rule is ALSO enforced lazily
 *  in every balance query, so daily cron is belt-and-braces. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await adminClient().rpc('release_commissions')
  if (error) {
    console.error('release_commissions failed:', error)
    return NextResponse.json({ error: 'RPC failed' }, { status: 500 })
  }

  return NextResponse.json({ released: data ?? 0 })
}
