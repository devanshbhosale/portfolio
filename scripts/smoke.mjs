#!/usr/bin/env node
// Post-deploy smoke check — run after every deploy (node scripts/smoke.mjs).
// Guards the fully-unlocked guarantee (the paywall was removed 2026-10-24:
// every row must carry its complete fields) and the trust pages. Exits
// non-zero on any failure so it can gate a deploy pipeline.
//
// Env: SITE_URL (default https://jobkarbe.vercel.app),
//      SUPABASE_URL + SUPABASE_ANON_KEY (or NEXT_PUBLIC_ variants) for the
//      REST leak check.

const SITE = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jobkarbe.vercel.app'
const SB_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed += 1
}

// 1) Trust/SEO surfaces respond.
for (const path of ['/terms', '/privacy', '/faq', '/contact', '/grievance', '/opengraph-image', '/api/jobs', '/ads.txt', '/sitemap.xml']) {
  try {
    const res = await fetch(`${SITE}${path}`)
    check(`GET ${path} → 200`, res.status === 200, `status ${res.status}`)
  } catch (e) {
    check(`GET ${path} → 200`, false, String(e))
  }
}

// 1a) /pricing retired with the payment system: it must 301 to /jobs.
try {
  const res = await fetch(`${SITE}/pricing`, { redirect: 'manual' })
  const location = res.headers.get('location') ?? ''
  check(
    '/pricing redirects to /jobs',
    (res.status === 301 || res.status === 308) && new URL(location, SITE).pathname === '/jobs',
    `status ${res.status}, location ${location}`,
  )
} catch (e) {
  check('/pricing redirects to /jobs', false, String(e))
}

// 1b) Compliance copy is live where it must be.
async function checkContains(path, needle, name) {
  try {
    const res = await fetch(`${SITE}${path}`)
    const html = await res.text()
    check(name, res.status === 200 && html.includes(needle), `status ${res.status}`)
  } catch (e) {
    check(name, false, String(e))
  }
}
await checkContains('/signup', 'I am 18 or older', '/signup has the 18+/consent checkbox')
await checkContains('/terms', 'operatorOP', '/terms names the operator')
await checkContains('/terms', 'Mumbai', '/terms carries governing-law venue')
await checkContains('/grievance', '48 hours', '/grievance carries the acknowledgement SLA')

// 1c) Ad-surface posture: CSP must allow AdSense script origins (regression
// guard — a header refactor that drops them silently kills every ad).
try {
  const res = await fetch(SITE)
  const csp = res.headers.get('content-security-policy') ?? ''
  check(
    'CSP allows googlesyndication scripts',
    csp.includes('pagead2.googlesyndication.com'),
    csp ? 'csp present, origin missing' : 'no CSP header',
  )
} catch (e) {
  check('CSP allows googlesyndication scripts', false, String(e))
}

// 2) /api/jobs serves COMPLETE rows to an anonymous caller — the old
// paywall redaction is gone; a premium row missing its fields means the
// redaction crept back in (values may be null, the keys must exist).
try {
  const res = await fetch(`${SITE}/api/jobs`)
  const body = await res.json()
  const jobs = body.jobs ?? []
  check('/api/jobs returns jobs', jobs.length > 0, `${jobs.length} rows`)
  const premium = jobs.filter((j) => j.is_premium)
  check('premium rows present in page 1 sample', premium.length > 0, `${premium.length} premium rows`)
  const locked = jobs.filter(
    (j) => j.is_premium && (!('apply_url' in j) || !('description' in j) || !('source_link' in j)),
  )
  check('premium rows carry apply_url/description/source_link keys', locked.length === 0, `${locked.length} redacted`)
} catch (e) {
  check('premium rows fully unlocked', false, String(e))
}

// 2b) Smart search: filtered query → 200 with facets; suggestion invariant
// (a suggestion may only appear when total is 0).
try {
  const res = await fetch(
    `${SITE}/api/jobs?q=driver&salary=under20k&exp=fresher&posted=7&sort=newest`,
  )
  const body = await res.json()
  const f = body.facets
  const facetsOk = f && Array.isArray(f.tags) && Array.isArray(f.locations)
    && typeof f.experience === 'object' && typeof f.salary === 'object'
  check('filtered /api/jobs → 200 with facets', res.status === 200 && facetsOk, `status ${res.status}`)
  check('filtered /api/jobs reports total', typeof body.total === 'number', `total ${body.total}`)
  check('suggestion only on zero-result queries', body.suggestion === undefined || body.total === 0)
} catch (e) {
  check('smart search checks', false, String(e))
}

// 2c) Garbage query → clean zero-result response, never a 5xx.
try {
  const res = await fetch(`${SITE}/api/jobs?q=zzqqxx12345nope`)
  const body = await res.json()
  check(
    'garbage query → 200 with total 0',
    res.status === 200 && body.total === 0 && Array.isArray(body.jobs) && body.jobs.length === 0,
    `status ${res.status}, total ${body.total}`,
  )
} catch (e) {
  check('garbage query → 200', false, String(e))
}

// 2d) A previously locked (premium) job detail page now carries full
// JobPosting JSON-LD — the SEO win of removing the paywall.
try {
  const res = await fetch(`${SITE}/api/jobs`)
  const body = await res.json()
  const premium = body.jobs?.find((j) => j.is_premium)
  if (premium?.id) {
    const detail = await fetch(`${SITE}/jobs/${premium.id}`)
    const html = await detail.text()
    check(
      'premium /jobs/[id] carries JobPosting JSON-LD',
      detail.status === 200 && html.includes('application/ld+json') && html.includes('JobPosting'),
      `status ${detail.status}`,
    )
  } else {
    check('premium /jobs/[id] carries JobPosting JSON-LD', false, 'no premium job to test')
  }
} catch (e) {
  check('premium /jobs/[id] JSON-LD', false, String(e))
}

// 1e) Report-this-listing control is present on job detail pages (SSR).
try {
  const res = await fetch(`${SITE}/api/jobs`)
  const body = await res.json()
  const first = body.jobs?.[0]
  if (first?.id) {
    const detail = await fetch(`${SITE}/jobs/${first.id}`)
    const html = await detail.text()
    check(
      '/jobs/[id] shows the Report this listing control',
      detail.status === 200 && html.includes('Report this listing'),
      `status ${detail.status}`,
    )
  } else {
    check('/jobs/[id] shows the Report this listing control', false, 'no job to test')
  }
} catch (e) {
  check('/jobs/[id] report control', false, String(e))
}

// 3) The REST backdoor stays shut: anon key must be DENIED on public_jobs.
if (SB_URL && ANON) {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/public_jobs?select=id&limit=1`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
    })
    check('anon REST /public_jobs denied', res.status === 401 || res.status === 403, `status ${res.status}`)
  } catch (e) {
    check('anon REST /public_jobs denied', false, String(e))
  }
} else {
  console.log('SKIP  anon REST check (SUPABASE_URL / SUPABASE_ANON_KEY not set)')
}

// 3b) Anon is also denied on reports (signed-out users get the mailto fallback).
if (SB_URL && ANON) {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/reports?select=id&limit=1`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
    })
    check('anon REST /reports denied', res.status === 401 || res.status === 403, `status ${res.status}`)
  } catch (e) {
    check('anon REST /reports denied', false, String(e))
  }
}

console.log(failed === 0 ? '\nAll smoke checks passed.' : `\n${failed} smoke check(s) FAILED.`)
process.exit(failed === 0 ? 0 : 1)
