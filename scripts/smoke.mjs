#!/usr/bin/env node
// Post-deploy smoke check — run after every deploy (node scripts/smoke.mjs).
// Guards the paywall guarantee and the trust pages. Exits non-zero on any
// failure so it can gate a deploy pipeline.
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
for (const path of ['/terms', '/privacy', '/faq', '/contact', '/opengraph-image', '/api/jobs']) {
  try {
    const res = await fetch(`${SITE}${path}`)
    check(`GET ${path} → 200`, res.status === 200, `status ${res.status}`)
  } catch (e) {
    check(`GET ${path} → 200`, false, String(e))
  }
}

// 2) /api/jobs serves NO premium fields to an anonymous caller.
try {
  const res = await fetch(`${SITE}/api/jobs`)
  const body = (await res.json()) as { jobs?: Record<string, unknown>[] }
  const jobs = body.jobs ?? []
  check('/api/jobs returns jobs', jobs.length > 0, `${jobs.length} rows`)
  const leaks = jobs.filter(
    (j) => j.is_premium && ('apply_url' in j || 'description' in j || 'source_link' in j),
  )
  check('/api/jobs locked rows carry no apply_url/description/source_link', leaks.length === 0, `${leaks.length} leaks`)
} catch (e) {
  check('/api/jobs locked rows clean', false, String(e))
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

console.log(failed === 0 ? '\nAll smoke checks passed.' : `\n${failed} smoke check(s) FAILED.`)
process.exit(failed === 0 ? 0 : 1)
