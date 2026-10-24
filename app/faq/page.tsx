import type { Metadata } from 'next'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import FaqAccordion, { type FaqItem } from '@/components/FaqAccordion'

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers to common questions about Jobkarbe: browsing jobs, featured listings, accounts, and applications.',
}

const faqs: FaqItem[] = [
  {
    question: 'What is Jobkarbe?',
    answer:
      'Jobkarbe brings blue-collar and entry-level job listings from public company career pages into one place so you can search and apply directly. It is free, and always will be.',
  },
  {
    question: 'Do I need an account to browse jobs?',
    answer:
      'No. Browsing and searching every listing is free. Creating a free account lets you save jobs for later and track which ones you have already applied to.',
  },
  {
    question: 'What does a Featured badge mean?',
    answer:
      'Featured listings are roles our team has highlighted. Every listing on Jobkarbe, featured or not, shows its full details and apply link for free.',
  },
  {
    question: 'Is Jobkarbe really free?',
    answer:
      'Yes. Browsing, searching, and applying are all free. The site is supported by advertising, so jobseekers never pay us anything.',
  },
  {
    question: 'Where do the job listings come from?',
    answer:
      'Listings are aggregated from publicly available company career pages and public job boards. Details can change or expire, so always double-check the role on the company\u2019s official site before applying.',
  },
  {
    question: 'Is Jobkarbe the employer for any of these jobs?',
    answer:
      'No. Jobkarbe is not the employer for any role displayed on the site. We surface listings from across the web, and hiring decisions are made entirely by the companies themselves.',
  },
  {
    question: 'How do I delete my account or my data?',
    answer:
      'Email jobkarbe@gmail.com from your registered address and we will remove your account and personal data from our systems. We respond within 30 days.',
  },
  {
    question: 'Do I pay to apply for jobs?',
    answer:
      'No. Applying is always free, and legitimate employers never ask candidates for money.',
  },
  {
    question: 'Why do I see ads?',
    answer:
      'Ads keep Jobkarbe free to use. They cover the cost of running the service without charging jobseekers.',
  },
  {
    question: 'Is Jobkarbe legitimate?',
    answer:
      'Yes. Every listing is reviewed by our team before going live, applying is always free, and you can see exactly who operates the service and how to raise a complaint on our grievance page.',
  },
]

export default function FaqPage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <PageHeader
        title="Frequently Asked Questions"
        subtitle="Everything people usually ask about Jobkarbe: jobs, applications, and accounts."
      />

      <FaqAccordion items={faqs} />

      <div className="mt-10 bg-primary-50 border border-primary-100 rounded-xl p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900">Still have a question?</h2>
        <p className="mt-2 text-gray-600">
          We usually reply within 24 to 48 hours.
        </p>
        <Link
          href="/contact"
          className="mt-4 inline-flex items-center justify-center rounded-lg font-semibold bg-primary-600 text-white hover:bg-primary-700 px-6 py-3 text-base transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Contact Support
        </Link>
      </div>
    </div>
  )
}
