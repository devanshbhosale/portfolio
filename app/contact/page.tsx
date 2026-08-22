import type { Metadata } from 'next'
import Link from 'next/link'
import { Briefcase, Clock, Mail } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

export const metadata: Metadata = {
  title: 'Contact Us — Jobkar',
  description:
    'Reach the Jobkar team by email for help with job listings, premium plans, referral rewards, or anything else.',
}

const SUPPORT_EMAIL = 'jobkarsupport@gmail.com'

export default function ContactPage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <PageHeader
        title="Contact Us"
        subtitle="Questions about jobs, premium plans, or referral rewards? We're here to help."
      />

      <div className="mt-10 bg-white rounded-xl border border-gray-200 shadow-card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary-50 text-primary-600">
            <Mail size={22} aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Email us</h2>
            <p className="text-sm text-gray-500">The fastest way to reach our support team.</p>
          </div>
        </div>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-5 block text-center text-xl sm:text-2xl font-bold text-primary-600 hover:text-primary-700 break-all"
        >
          {SUPPORT_EMAIL}
        </a>
        <p className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500">
          <Clock size={16} aria-hidden /> We typically reply within 24–48 hours.
        </p>

        <div className="border-t border-gray-100 mt-6 pt-6">
          <h3 className="font-semibold text-gray-900">To help us resolve your issue faster, include:</h3>
          <ul className="mt-3 list-disc pl-6 space-y-2 text-gray-600">
            <li>The email address on your Jobkar account, if you have one</li>
            <li>The job title or link, if your question is about a specific listing</li>
            <li>What happened, including any error message you saw</li>
          </ul>
        </div>

        <div className="border-t border-gray-100 mt-6 pt-6">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-11 h-11 rounded-lg bg-accent-50 text-accent-600">
              <Briefcase size={22} aria-hidden />
            </span>
            <h3 className="font-semibold text-gray-900">Job providers</h3>
          </div>
          <p className="mt-3 text-gray-600">
            Want to list your openings on Jobkar? Email us with your company name and the roles
            you&apos;re hiring for — we&apos;ll take it from there.
          </p>
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-gray-500">
        Looking for something else?{' '}
        <Link href="/faq" className="font-semibold text-primary-600 hover:text-primary-700">
          Read the FAQ
        </Link>
        {' · '}
        <Link href="/terms" className="font-semibold text-primary-600 hover:text-primary-700">
          Terms
        </Link>
        {' · '}
        <Link href="/privacy" className="font-semibold text-primary-600 hover:text-primary-700">
          Privacy
        </Link>
      </p>
    </div>
  )
}
