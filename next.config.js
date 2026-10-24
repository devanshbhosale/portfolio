/** @type {import('next').NextConfig} */

const securityHeaders = [
  // HSTS — force HTTPS on top-level navigation (max-age ~2 years, include
  // subdomains). Preload excluded intentionally to require manual submission.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  // Prevent clickjacking / framing of OUR pages (ad iframes we embed are
  // governed by frame-src below, unaffected by X-Frame-Options).
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stop MIME sniffing of our JSON/text endpoints.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Tighten referrer leakage.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Baseline CSP. AdSense needs its syndication/doubleclick script + frame
  // origins (added with the ads build, 2026-10-24). The pre-existing
  // unsafe-inline/unsafe-eval trade stays until the nonce-based CSP fix
  // (security-posture item) lands.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://tpc.googlesyndication.com https://www.googletagmanager.com https://*.doubleclick.net https://*.google.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https:",
      "frame-src 'self' https://tpc.googlesyndication.com https://googleads.g.doubleclick.net",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  async redirects() {
    return [
      // /pricing retired with the payment system (2026-10-24); old links
      // keep working and hand their equity to the jobs feed.
      { source: '/pricing', destination: '/jobs', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}
module.exports = nextConfig
