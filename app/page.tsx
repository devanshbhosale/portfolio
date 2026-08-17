'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, ShieldCheck, Users, Gift, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import JobCard from '@/components/JobCard'
import BlurredJobCard from '@/components/BlurredJobCard'
import StatsCounter from '@/components/StatsCounter'
import { mockJobs } from '@/data/jobs'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const sampleFreeJobs = mockJobs.filter(j => !j.premium).slice(0, 3)
  const samplePremiumJobs = mockJobs.filter(j => j.premium).slice(0, 3)

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
            Jobkar brings blue‑collar job listings with premium exclusives. Refer friends and earn 20% commission on every plan they buy.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <Button href="/jobs" size="lg" variant="primary">
              Browse Jobs <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button href="/pricing" size="lg" variant="outline">
              See Premium Plans
            </Button>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: ShieldCheck, title: 'Verified Listings', desc: 'All jobs are approved by our admins before going live.' },
              { icon: Gift, title: 'Referral Rewards', desc: 'Earn 20% of every premium purchase made with your code.' },
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
                <feature.icon className="text-primary-600 mb-3" size={28} />
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
            {sampleFreeJobs.map((job, i) => (
              <JobCard key={job.id} job={job} index={i} />
            ))}
            {samplePremiumJobs.map((job, i) => (
              <BlurredJobCard key={job.id} job={job} index={i} onLockClick={() => router.push('/pricing')} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Button href="/jobs" variant="outline" size="lg">View All Jobs</Button>
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatsCounter value={2500} label="Active Jobs" />
            <StatsCounter value={1200} label="Premium Members" />
            <StatsCounter value={850} label="Referral Payouts" />
            <StatsCounter value={98} label="Success Rate" suffix="%" />
          </div>
        </div>
      </section>
    </div>
  )
}
