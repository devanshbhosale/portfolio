import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jobkar.vercel.app'
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/api/', '/profile', '/login', '/signup'],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
