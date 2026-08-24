import Button from '@/components/ui/Button'
import HomeAnimated from '@/components/HomeAnimated'
import JobCard from '@/components/JobCard'
import BlurredJobCard from '@/components/BlurredJobCard'
import StatsCounter from '@/components/StatsCounter'
import { adminClient, getAuthedProfile, isPremiumActive } from '@/lib/server'
import { isTeaser, redactJob } from '@/lib/jobRedaction'
import type { PublicJob } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  // Server-side fetch + entitlement redaction: premium fields never enter
  // an unentitled browser's payload (viewer-dependent → force-dynamic).
  // Animated sections live in HomeAnimated (client) — motion.* can't be
  // referenced directly from this server component tree.
  const unlocked = isPremiumActive(await getAuthedProfile())
  const db = adminClient()

  const { data: latest } = await db
    .from('public_jobs')
    .select('*')
    .order('approved_at', { ascending: false })
    .limit(6)
  const rows = ((latest ?? []) as PublicJob[]).map((j) => redactJob(j, unlocked))

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [all, premium, fresh] = await Promise.all([
    db.from('public_jobs').select('*', { count: 'exact', head: true }),
    db.from('public_jobs').select('*', { count: 'exact', head: true }).eq('is_premium', true),
    db.from('public_jobs').select('*', { count: 'exact', head: true }).gte('approved_at', weekAgo),
  ])
  const stats = { activeJobs: all.count ?? 0, premiumJobs: premium.count ?? 0, freshJobs: fresh.count ?? 0 }

  const freeJobs = rows.filter((j): j is PublicJob => !j.is_premium).slice(0, 3)
  const premiumSample = rows.filter((j) => j.is_premium).slice(0, 3)

  return (
    <div className="bg-white">
      <HomeAnimated />

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Latest Opportunities</h2>
            <p className="mt-2 text-gray-600">A mix of free and premium listings</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {freeJobs.map((job, i) => (
              <JobCard key={job.id} job={job} index={i} />
            ))}
            {premiumSample.map((job, i) => (
              isTeaser(job)
                ? <BlurredJobCard key={job.id} job={job} index={i} />
                : <JobCard key={job.id} job={job} index={i} isPremium />
            ))}
          </div>
          <div className="text-center mt-10">
            <Button href="/jobs" variant="outline" size="lg">View All Jobs</Button>
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <StatsCounter value={stats.activeJobs} label="Active Jobs" />
            <StatsCounter value={stats.premiumJobs} label="Premium Listings" />
            <StatsCounter value={stats.freshJobs} label="New This Week" />
          </div>
        </div>
      </section>
    </div>
  )
}
