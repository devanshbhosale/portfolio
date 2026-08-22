import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { MapPin, Briefcase, Clock, Tag, ArrowLeft, Lock, Star, Phone } from 'lucide-react'
import Button from '@/components/ui/Button'
import SaveHeart from '@/components/SaveHeart'
import ApplyButton from '@/components/ApplyButton'
import { adminClient, getAuthedProfile, isPremiumActive } from '@/lib/server'
import { safeExternalUrl } from '@/lib/safe-url'
import { buildJobPostingLd } from '@/lib/jobPosting'
import type { PublicJob } from '@/lib/database.types'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jobkarbe.vercel.app'

async function getJob(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null
  // public_jobs is the approved + unexpired projection, so this lookup
  // can never return a pending/rejected/expired listing.
  const { data } = await adminClient().from('public_jobs').select('*').eq('id', id).single()
  return (data as PublicJob | null) ?? null
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const job = await getJob(params.id)
  if (!job) return { title: 'Job not found — Jobkar' }
  return {
    title: `${job.title} at ${job.company} — Jobkar`,
    description: (job.description ?? `${job.title} role in ${job.location ?? 'India'}`).slice(0, 160),
  }
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const job = await getJob(params.id)
  if (!job) notFound()

  // The lock must factor in the VIEWER: a premium subscriber never sees a
  // paywall, even on premium listings without contact_info (2026-08-22 bug —
  // locked was just job.is_premium, hiding the Apply button from payers).
  const locked = Boolean(job.is_premium) && !isPremiumActive(await getAuthedProfile())

  let contactInfo: string | null = null
  if (!locked) {
    const { data } = await adminClient().from('job_listings').select('contact_info').eq('id', job.id).single()
    contactInfo = data?.contact_info ?? null
  }

  const featured = Boolean(job.is_featured && (!job.featured_until || new Date(job.featured_until).getTime() > Date.now()))
  const safeSourceLink = safeExternalUrl(job.source_link)
  const safeApplyUrl = safeExternalUrl(job.apply_url)
  const jobLd = buildJobPostingLd(job, `${SITE_URL}/jobs/${job.id}`)

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <script
        type="application/ld+json"
        // jobLd is built server-side from DB fields only — no user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobLd) }}
      />
      <Link href="/jobs" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} aria-hidden /> All jobs
      </Link>

      <article className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{job.title}</h1>
            <p className="mt-1 text-lg text-gray-600">{job.company}</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="flex flex-col items-end gap-2">
              {featured && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  <Star size={12} aria-hidden /> Featured
                </span>
              )}
              {job.is_premium && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${locked ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                  {locked ? <><Lock size={12} aria-hidden /> Premium</> : 'Premium · Unlocked'}
                </span>
              )}
            </div>
            <SaveHeart jobId={job.id} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
          {job.location && <span className="inline-flex items-center gap-1"><MapPin size={15} aria-hidden /> {job.location}</span>}
          {job.experience && <span className="inline-flex items-center gap-1"><Briefcase size={15} aria-hidden /> {job.experience}</span>}
          {job.salary_range && <span className="inline-flex items-center gap-1"><Clock size={15} aria-hidden /> {job.salary_range}</span>}
        </div>

        {(job.tags ?? []).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(job.tags ?? []).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-700">
                <Tag size={12} aria-hidden /> {tag}
              </span>
            ))}
          </div>
        )}

        {job.description && (
          <section className="mt-6 pt-6 border-t border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Job description</h2>
            <p className="mt-2 whitespace-pre-line text-gray-700 leading-relaxed">{job.description}</p>
          </section>
        )}

        <section className="mt-6 pt-6 border-t border-gray-100">
          {locked ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
              <Lock className="mx-auto text-amber-600 mb-2" size={24} aria-hidden />
              <h2 className="font-semibold text-gray-900">This is a premium listing</h2>
              <p className="mt-1 text-sm text-gray-600">Upgrade to see the full description details and direct HR contact.</p>
              <Button href="/pricing" variant="accent" className="mt-4">View Premium Plans</Button>
            </div>
          ) : (
            <div>
              {safeApplyUrl && <ApplyButton jobId={job.id} href={safeApplyUrl} />}
              <h2 className="mt-6 text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Phone size={18} className="text-primary-600" aria-hidden /> HR contact
              </h2>
              {contactInfo ? (
                <p className="mt-2 text-gray-700 whitespace-pre-line">{contactInfo}</p>
              ) : (
                <p className="mt-2 text-gray-600">Contact details not provided for this listing.</p>
              )}
              {safeSourceLink && (
                <a
                  href={safeSourceLink}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1 mt-4 text-sm text-gray-500 hover:text-gray-700"
                >
                  View original posting ↗
                </a>
              )}
            </div>
          )}
        </section>
      </article>
    </div>
  )
}
