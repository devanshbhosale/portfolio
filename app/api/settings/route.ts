import { NextResponse } from 'next/server'
import { getSiteSettings } from '@/lib/settings'

// Reads no request data, so Next would prerender this handler at build time
// and freeze settings (prices, withdraw threshold) at deploy values. The
// dashboard-editable settings must serve live — same reason /pricing is
// force-dynamic.
export const dynamic = 'force-dynamic'

/** Public pricing/config subset (used by the pricing page). mrps are
 *  intentionally omitted — invented display prices are no longer served
 *  anywhere, not even this endpoint. */
export async function GET() {
  const settings = await getSiteSettings()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stripping the invented display prices from the wire
  const { mrps, ...publicSettings } = settings
  void mrps
  return NextResponse.json(publicSettings)
}
