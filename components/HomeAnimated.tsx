'use client'
// Client island for everything animated on the landing page. framer-motion's
// motion.* elements are runtime proxies — they can't be referenced from the
// server component tree (React Client Manifest error), so app/page.tsx keeps
// only data fetching and renders this component for the hero + features.
import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck, Users, Gift } from 'lucide-react'
import Button from '@/components/ui/Button'
import HeroParticles from '@/components/HeroParticles'
import DecodeHeading from '@/components/DecodeHeading'
import HomeSearch from '@/components/HomeSearch'

export default function HomeAnimated() {
  return (
    <>
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
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6 }}
          >
            <HomeSearch />
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
    </>
  )
}
