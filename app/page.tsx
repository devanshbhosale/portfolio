import Button from '@/components/ui/Button'
import HomeAnimated from '@/components/HomeAnimated'
import HeroParticles from '@/components/HeroParticles'
import JobCard from '@/components/JobCard'
import StatsCounter from '@/components/StatsCounter'
import AdSlot from '@/components/ads/AdSlot'
import { adminClient } from '@/lib/server'
import { weekAgoIso } from '@/lib/freshness'
import type { PublicJob } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  // Animated sections live in HomeAnimated (client) — motion.* can't be
  // referenced directly from this server component tree.
  const db = adminClient()

  const { data: latest } = await db
    .from('public_jobs')
    .select('*')
    .order('approved_at', { ascending: false })
    .limit(6)
  const rows = (latest ?? []) as PublicJob[]

  const weekAgo = weekAgoIso()
  const [all, fresh] = await Promise.all([
    db.from('public_jobs').select('*', { count: 'exact', head: true }),
    db.from('public_jobs').select('*', { count: 'exact', head: true }).gte('approved_at', weekAgo),
  ])
  const stats = { activeJobs: all.count ?? 0, freshJobs: fresh.count ?? 0 }

  return (
    <div>
      {/* Page-wide motion backdrop, landing route only (fixed host sizes the
          canvas to the viewport; content paints above the -z-10 layer). */}
      <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden>
        <HeroParticles />
      </div>
      <HomeAnimated />

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Latest Opportunities</h2>
            <p className="mt-2 text-gray-600">Fresh listings added every day, always free to apply</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rows.map((job, i) => (
              <JobCard key={job.id} job={job} index={i} isPremium={Boolean(job.is_premium)} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Button href="/jobs" variant="outline" size="lg">View All Jobs</Button>
          </div>
        </div>
      </section>

      <section className="pb-16" aria-label="Advertisement">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AdSlot slot="homeTop" />
        </div>
      </section>

      <section className="py-16 bg-primary-600/85 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="grid grid-cols-2 gap-8">
            <StatsCounter value={stats.activeJobs} label="Active Jobs" />
            <StatsCounter value={stats.freshJobs} label="New This Week" />
          </div>
        </div>
      </section>

      <section className="py-16" aria-label="Advertisement">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AdSlot slot="homeBottom" />
        </div>
      </section>
    </div>
  )
}
