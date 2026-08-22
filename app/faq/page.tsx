import type { Metadata } from 'next'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import FaqAccordion, { type FaqItem } from '@/components/FaqAccordion'

export const metadata: Metadata = {
  title: 'FAQ — Jobkar',
  description:
    'Answers to common questions about Jobkar: browsing jobs, premium plans, referral rewards, withdrawals, payments, and refunds.',
}

const faqs: FaqItem[] = [
  {
    question: 'What is Jobkar?',
    answer:
      'Jobkar brings blue-collar and entry-level job listings from public company career pages into one place — and pays you for spreading the word. Every account gets a referral code that earns you a commission when someone buys a premium plan with it.',
  },
  {
    question: 'Do I need an account to browse jobs?',
    answer:
      'No. Browsing and searching every listing is free. Creating a free account lets you save jobs for later and track which ones you have already applied to.',
  },
  {
    question: 'What does a premium plan unlock?',
    answer:
      'Premium unlocks the apply button and contact details for premium listings (the ones marked with a crown), plus perks that grow with the plan — like weekly job alerts, resume review, and early access to new jobs. Free listings always stay free to apply to.',
  },
  {
    question: 'How much do premium plans cost?',
    answer:
      'Weekly is ₹99, Monthly is ₹199, Quarterly is ₹499, and Annual is ₹1,499. You can compare every plan and its perks on the Premium Plans page.',
  },
  {
    question: 'How does the referral program work?',
    answer:
      'Every account gets a unique referral code, shown in your Referral Dashboard. When someone signs up and buys a premium plan using your code, you earn a commission: 20% on Weekly and Monthly plans, and 25% on Quarterly and Annual plans.',
  },
  {
    question: 'When can I withdraw my referral earnings?',
    answer:
      'Once your lifetime earnings cross ₹500, connect your bank account in the Referral Dashboard and request a withdrawal. We review each request before paying out.',
  },
  {
    question: 'How do I pay for a premium plan?',
    answer:
      'Payments are processed securely through Razorpay — UPI, cards, net banking, and popular wallets are all supported.',
  },
  {
    question: 'Are refunds available?',
    answer:
      'Premium access is granted the moment your payment succeeds, so payments are non-refundable except where legally required. If you were charged incorrectly or something went wrong with your payment, email jobkarsupport@gmail.com and we will review it.',
  },
  {
    question: 'Where do the job listings come from?',
    answer:
      'Listings are aggregated from publicly available company career pages and public job boards. Details can change or expire, so always double-check the role on the company\u2019s official site before applying.',
  },
  {
    question: 'Is Jobkar the employer for any of these jobs?',
    answer:
      'No. Jobkar is not the employer for any role displayed on the site. We surface listings from across the web — hiring decisions are made entirely by the companies themselves.',
  },
  {
    question: 'How do I delete my account or my data?',
    answer:
      'Email jobkarsupport@gmail.com from your registered address and we will remove your account and personal data from our systems.',
  },
]

export default function FaqPage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <PageHeader
        title="Frequently Asked Questions"
        subtitle="Everything people usually ask about Jobkar — jobs, plans, and referral rewards."
      />

      <FaqAccordion items={faqs} />

      <div className="mt-10 bg-primary-50 border border-primary-100 rounded-xl p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900">Still have a question?</h2>
        <p className="mt-2 text-gray-600">
          We usually reply within 24–48 hours.
        </p>
        <Link
          href="/contact"
          className="mt-4 inline-flex items-center justify-center rounded-lg font-semibold bg-primary-600 text-white hover:bg-primary-700 px-6 py-3 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Contact Support
        </Link>
      </div>
    </div>
  )
}
