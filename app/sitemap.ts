import type { MetadataRoute } from 'next'
import { adminClient } from '@/lib/server'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jobkarbe.vercel.app'

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/jobs`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/pricing`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/faq`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  ]

  try {
    const { data: jobs } = await adminClient()
      .from('public_jobs')
      .select('id, approved_at')
      .order('approved_at', { ascending: false })
      .limit(5000)

    return [
      ...staticRoutes,
      ...(jobs ?? []).map((job) => ({
        url: `${base}/jobs/${job.id}`,
        lastModified: job.approved_at ?? undefined,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      })),
    ]
  } catch {
    // DB hiccup at request time — still serve the static entries.
    return staticRoutes
  }
}
