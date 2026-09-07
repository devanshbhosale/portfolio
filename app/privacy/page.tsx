import type { Metadata } from 'next'
import PageHeader from '@/components/PageHeader'

export const metadata: Metadata = {
  title: 'Privacy Policy — Jobkar',
  description:
    'How Jobkar collects, uses, and protects your data: account information, bank details for payouts, job data sourcing, cookies, and your rights.',
}

interface Section {
  heading: string
  paragraphs: string[]
}

const sections: Section[] = [
  {
    heading: '1. What we collect',
    paragraphs: [
      'When you create an account, we store your name, email address, and login credentials. We also keep your saved-job preferences and referral program history on your account.',
      'If you connect a bank account for referral payouts, we store the account holder name, account number, IFSC code, and PAN you enter in the bank-connect form. These details are used solely to send your referral earnings to you and for legally required tax reporting — they are never shared with anyone else.',
    ],
  },
  {
    heading: '2. How we use your data',
    paragraphs: [
      'Your information powers the core service: surfacing relevant job listings, processing premium plan payments (handled securely by Razorpay), running the referral rewards program including bank payouts, and providing customer support. We do not sell your personal information to third parties.',
    ],
  },
  {
    heading: '3. Job data',
    paragraphs: [
      'Every job listing on Jobkar originates from publicly accessible company career pages and public job boards. We do not scrape gated or private content. If you are an employer or HR contact and want your listing or contact details removed, email the grievance officer at jobkarsupport@gmail.com and we will act on it within 48 hours.',
    ],
  },
  {
    heading: '4. Cookies',
    paragraphs: [
      'We use only essential cookies today — to keep you signed in and manage your session. We do not run analytics or advertising cookies, so there is nothing to opt out of beyond these essentials.',
      'If we ever add analytics, we will add a consent banner in the same change and update this section.',
    ],
  },
  {
    heading: '5. Processors and where your data lives',
    paragraphs: [
      'We rely on these processors to run the service: Vercel (hosting), Supabase (database), Razorpay (payments), and Google/Gmail (support email). Your data is processed on their infrastructure, which is located in the United States.',
      'Payments are handled by Razorpay. Your card and UPI details are entered directly into Razorpay\u2019s checkout and never reach Jobkar\u2019s servers.',
    ],
  },
  {
    heading: '6. Retention',
    paragraphs: [
      'We keep your account data until you ask us to delete it. Payment records are retained for around 8 years as required by tax law. Withdrawal and payout records are kept for as long as needed to satisfy our tax and accounting obligations.',
    ],
  },
  {
    heading: '7. Adults only',
    paragraphs: [
      'Jobkar is a service for adults. You must be 18 or older to create an account. If we discover an account belonging to someone under 18, we terminate it.',
    ],
  },
  {
    heading: '8. Data breaches',
    paragraphs: [
      'If your personal data is breached, we will notify the Data Protection Board under India\u2019s Digital Personal Data Protection Act 2023 and the affected users without delay.',
    ],
  },
  {
    heading: '9. Your rights',
    paragraphs: [
      'You can request a copy of your data, ask for corrections, or delete your account at any time by emailing jobkarsupport@gmail.com from your registered address. We respond within 30 days.',
      'If you agreed to something you no longer want to agree to — such as marketing emails — tell us in the same email and we will withdraw it for you.',
    ],
  },
  {
    heading: '10. Contact',
    paragraphs: [
      'For any privacy-related question, reach the grievance officer at jobkarsupport@gmail.com.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <PageHeader title="Privacy Policy" subtitle="Last updated: September 2026" />

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
        {' '}or visit the{' '}
        <a href="/grievance" className="font-semibold text-primary-600 hover:text-primary-700">
          grievance page
        </a>
        .
      </p>
    </div>
  )
}
