import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Clock, ShieldCheck } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

export const metadata: Metadata = {
  title: 'Grievance Redressal — Jobkar',
  description:
    'How to raise a grievance with Jobkar: the grievance officer, the process, response times, and escalation.',
}

const SUPPORT_EMAIL = 'jobkarsupport@gmail.com'

export default function GrievancePage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <PageHeader
        title="Grievance Redressal"
        subtitle="Not happy with something on Jobkar? Here is exactly how we handle it."
      />

      {/* Officer + SLA */}
      <div className="mt-10 bg-white rounded-xl border border-gray-200 shadow-card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary-50 text-primary-600">
            <ShieldCheck size={22} aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Grievance Officer</h2>
            <p className="text-sm text-gray-500">operatorOP · Mumbai, Maharashtra, India</p>
          </div>
        </div>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-5 block text-center text-xl sm:text-2xl font-bold text-primary-600 hover:text-primary-700 break-all"
        >
          {SUPPORT_EMAIL}
        </a>
        <div className="mt-6 grid sm:grid-cols-2 gap-4 text-sm text-gray-600">
          <p className="flex items-center gap-2">
            <Clock size={16} className="text-success shrink-0" aria-hidden />
            Acknowledgement within <strong>48 hours</strong>
          </p>
          <p className="flex items-center gap-2">
            <Mail size={16} className="text-success shrink-0" aria-hidden />
            Resolution within <strong>15 days</strong>
          </p>
        </div>
      </div>

      {/* Process */}
      <div className="mt-10 space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-gray-900">How it works</h2>
          <ol className="mt-4 space-y-3 text-gray-600 list-decimal list-inside">
            <li>
              Email <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary-600 hover:text-primary-700">{SUPPORT_EMAIL}</a> with
              what happened. Include your account email and, if it is about a payment, the payment reference.
            </li>
            <li>We reply with a ticket reference. Keep it for any follow-up.</li>
            <li>We investigate and get back with an answer or fix.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">What you can raise</h2>
          <ul className="mt-4 space-y-3 text-gray-600 list-disc list-inside">
            <li>Payment and refund issues, including wrong or duplicate charges</li>
            <li>A listing that is a scam, expired, discriminatory, or asks for money to apply</li>
            <li>Privacy requests: a copy of your data, corrections, or account deletion</li>
            <li>An employer or HR contact asking to have their details removed</li>
          </ul>
          <p className="mt-3 text-gray-600">
            Listing problems can also be flagged in one click with the{' '}
            <strong>Report this listing</strong> control on any job page.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">Escalation</h2>
          <p className="mt-3 text-gray-600">
            If your grievance is not resolved within 15 days, or you are not satisfied with the
            resolution, reply to the same email thread quoting your ticket reference. It is then
            reviewed afresh by the operator and answered within 7 more days.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">Your other rights</h2>
          <p className="mt-3 text-gray-600">
            Nothing on this page limits your rights under the Consumer Protection Act, 2019 —
            including approaching a consumer forum or the National Consumer Helpline (1915).
          </p>
        </section>
      </div>

      <p className="mt-10 border-t border-gray-200 pt-6 text-sm text-gray-500 text-center">
        General question rather than a complaint?{' '}
        <Link href="/contact" className="font-semibold text-primary-600 hover:text-primary-700">
          Contact us
        </Link>
        {' · '}
        <Link href="/faq" className="font-semibold text-primary-600 hover:text-primary-700">
          Read the FAQ
        </Link>
      </p>
    </div>
  )
}
