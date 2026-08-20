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
  // Baseline CSP. Razorpay checkout loads its script + iframe from its own
  // origins, so those are allowlisted below.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://api.razorpay.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' ws: wss: https:",
      "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
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
