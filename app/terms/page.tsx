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
    heading: '1. Who operates Jobkar',
    paragraphs: [
      'Jobkar is owned and operated by operatorOP, of Mumbai, Maharashtra, India. These terms form an agreement between you and operatorOP, and apply to your use of the website and every purchase made on it.',
    ],
  },
  {
    heading: '2. Using Jobkar',
    paragraphs: [
      'You agree to use Jobkar lawfully and solely to search and apply for jobs for yourself. You may not scrape or resell data from the site, share your premium access with others, or attempt to work around the paywall. Violating these rules may result in termination of your account.',
      'You must be 18 or older to use Jobkar. Accounts of users under 18 are terminated on discovery.',
    ],
  },
  {
    heading: '3. Accounts',
    paragraphs: [
      'You are responsible for keeping your login credentials secure and for all activity that happens on your account. If you suspect unauthorized access to your account, report it to us immediately at jobkarsupport@gmail.com.',
    ],
  },
  {
    heading: '4. Subscriptions and refunds',
    paragraphs: [
      'Premium plans (Weekly, Monthly, and Lifetime) unlock the apply flow for premium listings and their associated perks for the duration of the plan. Weekly and Monthly grants last 7 and 30 days. Lifetime grants access for as long as Jobkar operates the service.',
      'Jobkar charges for platform access. You never pay to apply for a job — legitimate employers never ask candidates for money.',
      'Because access is granted instantly, we refund: a wrong or duplicate charge, a payment where premium access was never unlocked, or a technical defect that prevents access you paid for. Refund requests are reviewed within 48 hours and paid within 5–7 working days to your original payment method.',
    ],
  },
  {
    heading: '5. Referral rewards',
    paragraphs: [
      'Every account receives a referral code. When a new user purchases a premium plan using your code, you earn a commission — 20% on Weekly and Monthly plans, and 25% on the Lifetime plan. Commissions can be withdrawn once your lifetime earnings cross ₹500. Earnings depend on purchases made with your code and are not guaranteed income.',
      'Commissions are your income; taxes on them are your responsibility. Payouts require the bank details and PAN you provide in the bank-connect form, which are used solely to send your earnings.',
      'Self-referrals, fake accounts, and any other abuse of the referral program will result in forfeiture of all rewards and may lead to account termination.',
    ],
  },
  {
    heading: '6. Job content',
    paragraphs: [
      'Job listings on Jobkar are aggregated from publicly available company career pages and public job boards. We do not guarantee the accuracy, availability, or status of any listing — always verify a role on the official company site before applying. Jobkar is not the employer for any role displayed on the site.',
      'If a listing looks wrong — a scam, expired, asking for money, or discriminatory — use the Report this listing control on the job page or email jobkarsupport@gmail.com. We review reports and act on valid ones within 36 hours.',
    ],
  },
  {
    heading: '7. Liability',
    paragraphs: [
      'The service is provided on an \u201cas is\u201d basis. To the maximum extent permitted by law, Jobkar is not liable for any indirect or consequential damages arising from your use of the site.',
      'Nothing in these terms limits your rights under the Consumer Protection Act, 2019 or any other right that cannot lawfully be excluded.',
    ],
  },
  {
    heading: '8. Changes',
    paragraphs: [
      'We may update these terms from time to time. Material changes will be communicated by email or an on-site notice. Continuing to use Jobkar after a change means you accept the updated terms.',
    ],
  },
  {
    heading: '9. Governing law',
    paragraphs: [
      'These terms are governed by the laws of India. Courts at Mumbai, Maharashtra have exclusive jurisdiction over any dispute arising from your use of Jobkar.',
    ],
  },
]

export default function TermsPage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <PageHeader title="Terms of Service" subtitle="Last updated: September 2026" />

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
        {' '}or visit the{' '}
        <a href="/grievance" className="font-semibold text-primary-600 hover:text-primary-700">
          grievance page
        </a>
        .
      </p>
    </div>
  )
}
