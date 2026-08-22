import type { Metadata } from 'next'
import PageHeader from '@/components/PageHeader'

export const metadata: Metadata = {
  title: 'Privacy Policy — Jobkar',
  description:
    'How Jobkar collects, uses, and protects your data: account information, usage analytics, job data sourcing, cookies, and your rights.',
}

interface Section {
  heading: string
  paragraphs: string[]
}

const sections: Section[] = [
  {
    heading: '1. What we collect',
    paragraphs: [
      'When you create an account, we store your name, email address, and login credentials. We also keep your saved-job preferences and referral program history on your account, and collect basic usage analytics — such as page views and search filters used — to improve the product.',
    ],
  },
  {
    heading: '2. How we use your data',
    paragraphs: [
      'Your information powers the core service: surfacing relevant job listings, sending alerts you have opted into, processing premium plan payments (handled securely by Razorpay), running the referral rewards program, and providing customer support. We do not sell your personal information to third parties.',
    ],
  },
  {
    heading: '3. Job data',
    paragraphs: [
      'Every job listing on Jobkar originates from publicly accessible company career pages and public job boards. We do not scrape gated or private content.',
    ],
  },
  {
    heading: '4. Cookies',
    paragraphs: [
      'We use essential cookies to keep you signed in and manage your session, along with a small set of analytics cookies. Non-essential cookies can be turned off through your browser settings.',
    ],
  },
  {
    heading: '5. Your rights',
    paragraphs: [
      'You can request a copy of your data, ask for corrections, or delete your account at any time. Email jobkarsupport@gmail.com and we will take care of it.',
    ],
  },
  {
    heading: '6. Contact',
    paragraphs: [
      'For any privacy-related question, reach us at jobkarsupport@gmail.com.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <PageHeader title="Privacy Policy" subtitle="Last updated: August 2026" />

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
        Questions about this policy? Email us at{' '}
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
