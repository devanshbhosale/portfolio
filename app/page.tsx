'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck, Users, Gift } from 'lucide-react'
import Button from '@/components/ui/Button'
import JobCard from '@/components/JobCard'
import BlurredJobCard from '@/components/BlurredJobCard'
import SkeletonLoader from '@/components/SkeletonLoader'
import StatsCounter from '@/components/StatsCounter'
import { supabase } from '@/lib/supabase'
import type { PublicJob } from '@/lib/database.types'

interface Stats {
  activeJobs: number
  premiumJobs: number
  freshJobs: number
}

export default function LandingPage() {
  const [jobs, setJobs] = useState<PublicJob[] | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    supabase
      .from('public_jobs')
      .select('*')
      .order('approved_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setJobs((data as PublicJob[]) ?? []))

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    Promise.all([
      supabase.from('public_jobs').select('*', { count: 'exact', head: true }),
      supabase.from('public_jobs').select('*', { count: 'exact', head: true }).eq('is_premium', true),
      supabase.from('public_jobs').select('*', { count: 'exact', head: true }).gte('approved_at', weekAgo),
    ]).then(([all, premium, fresh]) => {
      setStats({
        activeJobs: all.count ?? 0,
        premiumJobs: premium.count ?? 0,
        freshJobs: fresh.count ?? 0,
      })
    })
  }, [])

  const freeJobs = (jobs ?? []).filter((j) => !j.is_premium).slice(0, 3)
  const premiumSample = (jobs ?? []).filter((j) => j.is_premium).slice(0, 3)

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50 opacity-70" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 120 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tighter text-gray-900"
          >
            Find Your Next Job, <br className="hidden md:block" />
            <span className="text-primary-600">Earn Rewards</span> by Referring
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Jobkar brings blue‑collar job listings with premium exclusives. Refer friends and earn 20%+ commission on every plan they buy.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <Button href="/jobs" size="lg" variant="primary">
              Browse Jobs <ArrowRight size={18} className="ml-2" aria-hidden />
            </Button>
            <Button href="/pricing" size="lg" variant="outline">See Premium Plans</Button>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: ShieldCheck, title: 'Verified Listings', desc: 'All jobs are approved by our admins before going live.' },
              { icon: Gift, title: 'Referral Rewards', desc: 'Earn 20%+ of every premium purchase made with your code.' },
              { icon: Users, title: 'Agent Managed', desc: 'Dedicated agents keep fresh listings coming every day.' },
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
          {jobs === null ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonLoader key={i} />)}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {freeJobs.map((job, i) => (
                <JobCard key={job.id} job={job} index={i} />
              ))}
              {premiumSample.map((job, i) => (
                <BlurredJobCard key={job.id} job={job} index={i} onLockClick={() => window.location.assign('/pricing')} />
              ))}
            </div>
          )}
          <div className="text-center mt-10">
            <Button href="/jobs" variant="outline" size="lg">View All Jobs</Button>
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatsCounter value={stats?.activeJobs ?? 0} label="Active Jobs" />
            <StatsCounter value={stats?.premiumJobs ?? 0} label="Premium Listings" />
            <StatsCounter value={stats?.freshJobs ?? 0} label="New This Week" />
            <StatsCounter value={98} label="Success Rate" suffix="%" />
          </div>
        </div>
      </section>
    </div>
  )
}
