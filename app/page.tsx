import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck, Users, Gift } from 'lucide-react'
import Button from '@/components/ui/Button'
import HeroParticles from '@/components/HeroParticles'
import DecodeHeading from '@/components/DecodeHeading'
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
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50 opacity-70" />
        <HeroParticles />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 120 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tighter text-gray-900"
          >
            <DecodeHeading segments={[{ text: 'Find Verified Jobs,' }]} />
            <br className="hidden md:block" />
            <DecodeHeading
              segments={[
                { text: 'Near You', className: 'text-primary-600' },
                { text: ' Today' },
              ]}
            />
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Jobkar brings fresh blue‑collar job listings with salary details upfront — browse free and apply directly. Refer friends and earn 20%+ when they go premium.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <Button href="/jobs" size="lg" variant="primary" className="cta-sweep">
              Browse Jobs <ArrowRight size={18} className="ml-2" aria-hidden />
            </Button>
            <Button href="/pricing" size="lg" variant="outline" className="cta-sweep">See Premium Plans</Button>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: ShieldCheck, title: 'Verified Listings', desc: 'Every job is reviewed and approved by our team before going live.' },
              { icon: Gift, title: 'Referral Rewards', desc: 'Earn 20%+ of every premium purchase made with your code.' },
              { icon: Users, title: 'Fresh Listings', desc: 'New opportunities added regularly, so there is always something new.' },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
              >
                <feature.icon className="text-primary-600 mb-3" size={28} aria-hidden />
                <h3 className="text-lg font-bold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-gray-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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
