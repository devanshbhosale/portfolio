import PricingPlans from '@/components/PricingPlans'
import type { PlanCard } from '@/components/PricingCard'
import { adminClient, getAuthedProfile, isPremiumActive } from '@/lib/server'
import { defaultSettings, getSiteSettings } from '@/lib/settings'
import { PLAN_BILLING_NOTES, PLAN_NAMES, PLAN_TAGLINES, rupees } from '@/lib/plans'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  // Server-computed: real job counts (same source as the homepage) and live
  // dashboard-editable prices/MRPs. Animated sections + Razorpay checkout
  // live in PricingPlans (client) — motion.* can't render from this tree.
  const db = adminClient()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  // Marketing page must not 500 on a transient DB blip — zeros are honest
  // (real counts, momentarily zeroed) unlike invented social-proof numbers.
  let stats = { activeJobs: 0, premiumJobs: 0, freshJobs: 0 }
  try {
    const [all, premium, fresh] = await Promise.all([
      db.from('public_jobs').select('*', { count: 'exact', head: true }),
      db.from('public_jobs').select('*', { count: 'exact', head: true }).eq('is_premium', true),
      db.from('public_jobs').select('*', { count: 'exact', head: true }).gte('approved_at', weekAgo),
    ])
    stats = { activeJobs: all.count ?? 0, premiumJobs: premium.count ?? 0, freshJobs: fresh.count ?? 0 }
  } catch {
    // keep zeros
  }

  let settings
  try {
    settings = await getSiteSettings()
  } catch {
    settings = defaultSettings()
  }

  const profile = await getAuthedProfile()
  const active = isPremiumActive(profile)

  const plans: PlanCard[] = PLAN_NAMES.map((name) => ({
    name,
    price: rupees(settings.prices[name]),
    mrp: rupees(settings.mrps[name]),
    tagline: PLAN_TAGLINES[name],
    billingNote: PLAN_BILLING_NOTES[name],
  }))

  return (
    <PricingPlans
      plans={plans}
      stats={stats}
      activePremiumUntil={active ? (profile?.premium_expires_at ?? null) : null}
    />
  )
}
