import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { MapPin, Briefcase, IndianRupee, Tag, ArrowLeft, Star, Phone } from 'lucide-react'
import ApplyButton from '@/components/ApplyButton'
import ReportListingButton from '@/components/ReportListingButton'
import SaveHeart from '@/components/SaveHeart'
import AdRail from '@/components/ads/AdRail'
import { adminClient } from '@/lib/server'
import { safeExternalUrl } from '@/lib/safe-url'
import { buildJobPostingLd } from '@/lib/jobPosting'
import { isFeaturedNow } from '@/lib/freshness'
import type { PublicJob } from '@/lib/database.types'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jobkarbe.vercel.app'

async function getJob(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null
  // public_jobs is the approved + unexpired projection, so this lookup
  // can never return a pending/rejected/expired listing.
  const { data } = await adminClient().from('public_jobs').select('*').eq('id', id).single()
  return (data as PublicJob | null) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const job = await getJob(id)
  if (!job) return { title: 'Job not found' }
  return {
    title: `${job.title} at ${job.company}`,
    description: (job.description ?? `${job.title} role in ${job.location ?? 'India'}`).slice(0, 160),
  }
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await getJob(id)
  if (!job) notFound()

  const { data: contactRow } = await adminClient()
    .from('job_listings')
    .select('contact_info')
    .eq('id', job.id)
    .single()
  const contactInfo = contactRow?.contact_info ?? null

  const featured = isFeaturedNow(job) || Boolean(job.is_premium)
  const safeSourceLink = safeExternalUrl(job.source_link)
  const safeApplyUrl = safeExternalUrl(job.apply_url)

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-3xl xl:max-w-6xl mx-auto xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-6">
      <div className="min-w-0">
      <script
        type="application/ld+json"
        // Job text comes from the scraping pipeline (third-party pages), so
        // `<` is escaped: JSON.stringify does not neutralize a `</script>`
        // inside a string, which would break out of this tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJobPostingLd(job, `${SITE_URL}/jobs/${job.id}`)).replace(/</g, '\\u003c'),
        }}
      />
      <Link href="/jobs" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} aria-hidden /> All jobs
      </Link>

      <article className="mt-4 bg-white rounded-xl border border-gray-200 shadow-xs p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{job.title}</h1>
            <p className="mt-1 text-lg text-gray-600">{job.company}</p>
          </div>
          <div className="flex items-start gap-2">
            {featured && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                <Star size={12} aria-hidden /> Featured
              </span>
            )}
            <SaveHeart jobId={job.id} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
          {job.location && <span className="inline-flex items-center gap-1"><MapPin size={15} aria-hidden /> {job.location}</span>}
          {job.experience && <span className="inline-flex items-center gap-1"><Briefcase size={15} aria-hidden /> {job.experience}</span>}
          {job.salary_range && <span className="inline-flex items-center gap-1"><IndianRupee size={15} aria-hidden /> {job.salary_range}</span>}
        </div>

        {(job.tags ?? []).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(job.tags ?? []).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-gray-100 text-xs text-gray-700">
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
          <div>
            {safeApplyUrl && (
              <>
                <ApplyButton jobId={job.id} href={safeApplyUrl} />
                <p className="mt-2 text-xs text-gray-500">
                  Legitimate employers never ask for money. Applying on Jobkarbe is always free.
                </p>
              </>
            )}
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
            <ReportListingButton jobId={job.id} jobTitle={job.title} />
          </div>
        </section>
      </article>
      </div>
      <AdRail slot="detailRail" />
    </div>
  )
}
