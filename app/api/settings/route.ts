import { NextResponse } from 'next/server'
import { getSiteSettings } from '@/lib/settings'

/** Public pricing/config subset (used by the pricing page). */
export async function GET() {
  const settings = await getSiteSettings()
  return NextResponse.json(settings)
}
