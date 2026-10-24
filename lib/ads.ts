/** AdSense configuration. Set NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-…) to light
 *  up every slot; while unset the site renders clean: no script, no slots,
 *  no consent banner. Slot ids come from the AdSense dashboard (create one
 *  unit per placement and paste its id) — '0' means the unit has not been
 *  created yet and that slot stays dark. */
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? ''

export const AD_SLOTS = {
  jobsLeftRail: '0', // 160x600 skyscraper
  jobsRightRail: '0', // 300x600 half page
  jobsInFeed: '0', // horizontal unit between card rows
  detailRail: '0', // 300x600 half page
  homeTop: '0', // horizontal
  homeBottom: '0', // horizontal
} as const

export type AdSlotKey = keyof typeof AD_SLOTS

/** Reserved heights per slot: space is held before the ad fills so ads can
 *  never shift content (CLS). Width is governed by the rail containers. */
export const AD_MIN_HEIGHTS: Record<AdSlotKey, number> = {
  jobsLeftRail: 600,
  jobsRightRail: 600,
  jobsInFeed: 120,
  detailRail: 600,
  homeTop: 120,
  homeBottom: 120,
}

export function isValidAdsenseClient(value: string | undefined | null): boolean {
  return typeof value === 'string' && /^ca-pub-\d{10,}$/.test(value)
}

export function adsEnabled(): boolean {
  return isValidAdsenseClient(ADSENSE_CLIENT)
}
