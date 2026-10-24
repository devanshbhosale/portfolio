import type { Metadata } from 'next'
import PageHeader from '@/components/PageHeader'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms that govern your use of Jobkarbe: accounts, job content, advertising, and liability.',
}

interface Section {
  heading: string
  paragraphs: string[]
}

const sections: Section[] = [
  {
    heading: '1. Who operates Jobkarbe',
    paragraphs: [
      'Jobkarbe is owned and operated by operatorOP, of Mumbai, Maharashtra, India. These terms form an agreement between you and operatorOP and apply to your use of the website.',
    ],
  },
  {
    heading: '2. Using Jobkarbe',
    paragraphs: [
      'You agree to use Jobkarbe lawfully and solely to search and apply for jobs for yourself. You may not scrape or resell data from the site. Violating these rules may result in termination of your account.',
      'You must be 18 or older to use Jobkarbe. Accounts of users under 18 are terminated on discovery.',
    ],
  },
  {
    heading: '3. Accounts',
    paragraphs: [
      'You are responsible for keeping your login credentials secure and for all activity that happens on your account. If you suspect unauthorized access to your account, report it to us immediately at jobkarbe@gmail.com.',
    ],
  },
  {
    heading: '4. Job content',
    paragraphs: [
      'Job listings on Jobkarbe are aggregated from publicly available company career pages and public job boards. We do not guarantee the accuracy, availability, or status of any listing, so always verify a role on the official company site before applying. Jobkarbe is not the employer for any role displayed on the site.',
      'If a listing looks wrong (a scam, expired, asking for money, or discriminatory), use the Report this listing control on the job page or email jobkarbe@gmail.com. We review reports and act on valid ones within 36 hours.',
    ],
  },
  {
    heading: '5. Advertising',
    paragraphs: [
      'Jobkarbe is free to use and supported by advertising. Ads are served by third-party networks such as Google AdSense. The network decides which ads appear, and we do not control or endorse the products and services advertised. You never pay to apply for a job, and legitimate employers never ask candidates for money.',
    ],
  },
  {
    heading: '6. Liability',
    paragraphs: [
      'The service is provided on an \u201cas is\u201d basis. To the maximum extent permitted by law, Jobkarbe is not liable for any indirect or consequential damages arising from your use of the site.',
      'Nothing in these terms limits your rights under the Consumer Protection Act, 2019 or any other right that cannot lawfully be excluded.',
    ],
  },
  {
    heading: '7. Changes',
    paragraphs: [
      'We may update these terms from time to time. Material changes will be communicated by email or an on-site notice. Continuing to use Jobkarbe after a change means you accept the updated terms.',
    ],
  },
  {
    heading: '8. Governing law',
    paragraphs: [
      'These terms are governed by the laws of India. Courts at Mumbai, Maharashtra have exclusive jurisdiction over any dispute arising from your use of Jobkarbe.',
    ],
  },
]

export default function TermsPage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <PageHeader title="Terms of Service" subtitle="Last updated: October 2026" />

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
          href="mailto:jobkarbe@gmail.com"
          className="font-semibold text-primary-600 hover:text-primary-700"
        >
          jobkarbe@gmail.com
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
