import type { Metadata } from 'next'
import PageHeader from '@/components/PageHeader'

export const metadata: Metadata = {
  title: 'Terms of Service — Jobkar',
  description:
    'The terms that govern your use of Jobkar: accounts, premium subscriptions, referral rewards, job content, and liability.',
}

interface Section {
  heading: string
  paragraphs: string[]
}

const sections: Section[] = [
  {
    heading: '1. Using Jobkar',
    paragraphs: [
      'You agree to use Jobkar lawfully and solely to search and apply for jobs for yourself. You may not scrape or resell data from the site, share your premium access with others, or attempt to work around the paywall. Violating these rules may result in termination of your account.',
    ],
  },
  {
    heading: '2. Accounts',
    paragraphs: [
      'You are responsible for keeping your login credentials secure and for all activity that happens on your account. If you suspect unauthorized access to your account, report it to us immediately at jobkarsupport@gmail.com.',
    ],
  },
  {
    heading: '3. Subscriptions and refunds',
    paragraphs: [
      'Premium plans (Weekly, Monthly, and Lifetime) unlock the apply flow for premium listings and their associated perks for the duration of the plan. Because access is granted instantly, payments are non-refundable except where legally required. If you believe you were charged incorrectly, contact us and we will review it.',
    ],
  },
  {
    heading: '4. Referral rewards',
    paragraphs: [
      'Every account receives a referral code. When a new user purchases a premium plan using your code, you earn a commission — 20% on Weekly and Monthly plans, and 25% on the Lifetime plan. Commissions can be withdrawn once your lifetime earnings cross ₹500.',
      'Self-referrals, fake accounts, and any other abuse of the referral program will result in forfeiture of all rewards and may lead to account termination.',
    ],
  },
  {
    heading: '5. Job content',
    paragraphs: [
      'Job listings on Jobkar are aggregated from publicly available company career pages and public job boards. We do not guarantee the accuracy, availability, or status of any listing — always verify a role on the official company site before applying. Jobkar is not the employer for any role displayed on the site.',
    ],
  },
  {
    heading: '6. Liability',
    paragraphs: [
      'The service is provided on an \u201cas is\u201d basis. To the maximum extent permitted by law, Jobkar is not liable for any indirect or consequential damages arising from your use of the site.',
    ],
  },
  {
    heading: '7. Changes',
    paragraphs: [
      'We may update these terms from time to time. Material changes will be communicated by email or an on-site notice. Continuing to use Jobkar after a change means you accept the updated terms.',
    ],
  },
]

export default function TermsPage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <PageHeader title="Terms of Service" subtitle="Last updated: August 2026" />

      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-semibold text-gray-900">{section.heading}</h2>
            {section.paragraphs.map((paragraph, i) => (
              <p key={i} className="mt-3 text-gray-600 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <p className="mt-10 border-t border-gray-200 pt-6 text-sm text-gray-500 text-center">
        Questions about these terms? Email us at{' '}
        <a
          href="mailto:jobkarsupport@gmail.com"
          className="font-semibold text-primary-600 hover:text-primary-700"
        >
          jobkarsupport@gmail.com
        </a>
        .
      </p>
    </div>
  )
}
