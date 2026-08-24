// Entitlement redaction — the security boundary for premium job data.
// The DB view hands the server full rows; a browser that isn't entitled
// never receives premium fields. Apply at every server exit point.
// (Anon SELECT on public_jobs is revoked — /api/jobs is the only list path.)
import type { PublicJob } from './database.types'

export interface TeaserJob {
  id: string
  is_premium: true
  locked: true
  title_prefix: string
  company: 'Top Employer'
  location: string | null
  experience: string | null
  salary_range: string | null
  tags: string[] | null
  created_at: string
}

export type ApiJob = PublicJob | TeaserJob

export function isTeaser(job: ApiJob): job is TeaserJob {
  return 'locked' in job && job.locked === true
}

/** Unlocked viewers (and free rows) get the full row. Locked premium rows
 *  get ONLY the teaser fields — never description, apply_url, source_link,
 *  full title or real company. */
export function redactJob(job: PublicJob, unlocked: boolean): ApiJob {
  if (unlocked || !job.is_premium) return job
  return {
    id: job.id,
    is_premium: true,
    locked: true,
    title_prefix: job.title.slice(0, 24),
    company: 'Top Employer',
    location: job.location,
    experience: job.experience,
    salary_range: job.salary_range,
    tags: job.tags,
    created_at: job.created_at,
  }
}
