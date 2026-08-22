import type { PublicJob } from '@/lib/database.types'
import { parseSalaryRange } from '@/lib/jobsFilters'

const EMPLOYMENT_MAP: Record<string, string> = {
  'full-time': 'FULL_TIME',
  'part-time': 'PART_TIME',
  contract: 'CONTRACT',
  internship: 'INTERN',
  temporary: 'TEMPORARY',
}

/** schema.org JobPosting structured data — makes listings eligible for
 *  Google Jobs. Undefined values are dropped by JSON.stringify. */
export function buildJobPostingLd(job: PublicJob, url: string): Record<string, unknown> {
  const employmentType = (job.tags ?? [])
    .map((t) => EMPLOYMENT_MAP[t.trim().toLowerCase()])
    .filter((v): v is string => Boolean(v))

  const salary = parseSalaryRange(job.salary_range)

  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description ?? `${job.title} role at ${job.company}${job.location ? ` in ${job.location}` : ''}.`,
    datePosted: (job.approved_at ?? job.created_at).slice(0, 10),
    hiringOrganization: { '@type': 'Organization', name: job.company },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location ?? undefined,
        addressCountry: 'IN',
      },
    },
    identifier: { '@type': 'PropertyValue', name: 'Jobkar', value: job.id },
    url,
  }
  if (employmentType.length > 0) ld.employmentType = employmentType
  if (job.expires_at) ld.validThrough = job.expires_at
  if (salary) {
    ld.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'INR',
      value: {
        '@type': 'QuantitativeValue',
        minValue: salary.min,
        maxValue: salary.max,
        unitText: salary.unitText,
      },
    }
  }
  return ld
}
