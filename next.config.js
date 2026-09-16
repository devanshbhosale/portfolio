/** @type {import('next').NextConfig} */

const securityHeaders = [
  // HSTS — force HTTPS on top-level navigation (max-age ~2 years, include
  // subdomains). Preload excluded intentionally to require manual submission.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  // Prevent clickjacking / framing.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stop MIME sniffing of our JSON/text endpoints.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Tighten referrer leakage.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Baseline CSP. Dodo Payments uses hosted checkout — the customer is
  // redirected to checkout.dodopayments.com, so no third-party scripts or
  // frames are needed on our origin at all.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https:",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.dodopayments.com",
    ].join('; '),
  },
]

const nextConfig = {
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
