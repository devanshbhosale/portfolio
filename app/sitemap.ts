import type { MetadataRoute } from 'next'
import { adminClient } from '@/lib/server'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jobkar.vercel.app'

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/jobs`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/pricing`, changeFrequency: 'weekly', priority: 0.7 },
  ]

  const { data: jobs } = await adminClient()
    .from('public_jobs')
    .select('id, approved_at')
    .order('approved_at', { ascending: false })
    .limit(1000)

  return [
    ...staticRoutes,
    ...(jobs ?? []).map((job) => ({
      url: `${base}/jobs/${job.id}`,
      lastModified: job.approved_at ?? undefined,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  ]
}
