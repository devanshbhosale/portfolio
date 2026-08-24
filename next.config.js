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
  // Baseline CSP. Razorpay checkout needs more than just checkout.razorpay.com:
  // its risk-detection bundle lives on cdn.razorpay.com, v2 checkout assets on
  // checkout-static-next.razorpay.com, internal calls use unsafe-eval, and it
  // frames an anti-fraud origin (wra-api.net). Verified against the browser
  // console during a live test payment — anything less logs CSP violations.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.razorpay.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https:",
      "frame-src 'self' https://*.razorpay.com https://*.wra-api.net",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.razorpay.com",
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
