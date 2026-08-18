import { NextResponse } from 'next/server'
import dns from 'node:dns/promises'
import net from 'node:net'
import { Agent } from 'undici'
import * as cheerio from 'cheerio'
import { getAuthedProfile, readJson } from '@/lib/server'
import { parseLinkSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'

const FETCH_TIMEOUT_MS = 10_000
const MAX_BYTES = 2 * 1024 * 1024
const MAX_REDIRECTS = 2

// ponytail: BlockList rebuilt per call is fine at agent traffic levels; module-level singleton if it ever shows in profiles.
function blockedIps(): net.BlockList {
  const bl = new net.BlockList()
  for (const [subnet, prefix] of [
    ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
    ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16],
    ['198.18.0.0', 15], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ] as const) {
    bl.addSubnet(subnet, prefix, 'ipv4')
  }
  for (const [subnet, prefix] of [
    ['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10],
    ['::ffff:0:0', 96], ['64:ff9b::', 96], ['::ffff:0:0:0', 96],
  ] as const) {
    bl.addSubnet(subnet, prefix, 'ipv6')
  }
  return bl
}

/** Resolve and verify every address is public. Returns the verified
 *  addresses so the fetch can be PINNED to them (closes the DNS-rebinding
 *  window between the check and the connection). */
async function resolvePublic(hostname: string): Promise<string[]> {
  const results = await dns.lookup(hostname, { all: true })
  const bl = blockedIps()
  const addresses = results.map((r) => r.address)
  if (addresses.length === 0) throw new Error('Could not resolve host')
  for (const address of addresses) {
    if (bl.check(address)) {
      throw new Error('Target host is not allowed')
    }
  }
  return addresses
}

async function fetchCapped(url: string): Promise<Response> {
  let current = url
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    // Resolve once, verify, then pin the fetch to exactly those addresses
    // via a custom undici Agent — the check and the connection see the
    // same IPs, so DNS rebinding cannot switch them in between.
    const addresses = await resolvePublic(new URL(current).hostname)
    const agent = new Agent({
      connect: {
        // Pin the connection to the pre-verified addresses.
        lookup: (_hostname, _opts, cb) =>
          cb(null, addresses.map((address) => ({ address, family: net.isIPv6(address) ? 6 : 4 }))),
      },
    })

    const res = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobkarAgent/1.0)' },
      dispatcher: agent,
    } as RequestInit)
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get('location')
      if (!location) throw new Error('Redirect without location')
      current = new URL(location, current).toString()
      continue
    }
    if (!res.ok) throw new Error(`Fetch failed (${res.status})`)

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) {
      throw new Error('Target is not an HTML page')
    }
    const reader = res.body?.getReader()
    if (!reader) throw new Error('Empty response')
    const chunks: Uint8Array[] = []
    let total = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_BYTES) {
        await reader.cancel()
        throw new Error('Page too large')
      }
      chunks.push(value)
    }
    const html = new TextDecoder('utf-8', { fatal: false }).decode(concat(chunks))
    return new Response(html, { headers: { 'content-type': 'text/html' } })
  }
  throw new Error('Too many redirects')
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0))
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}

function fromJsonLd($: cheerio.CheerioAPI): Partial<Record<'title' | 'company' | 'location' | 'salary' | 'description', string>> {
  const out: Partial<Record<'title' | 'company' | 'location' | 'salary' | 'description', string>> = {}
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    let data: unknown
    try {
      data = JSON.parse($(el).text())
    } catch {
      continue
    }
    const nodes = Array.isArray(data) ? data : [data]
    const posting = nodes.find(
      (n) => typeof n === 'object' && n !== null && (n as { '@type'?: string })['@type'] === 'JobPosting',
    ) as Record<string, unknown> | undefined
    if (!posting) continue
    const str = (v: unknown): string | undefined =>
      typeof v === 'string' ? v.trim() : typeof v === 'object' && v !== null
        ? String((v as { name?: string; value?: string }).name ?? (v as { value?: string }).value ?? '').trim() || undefined
        : undefined
    out.title = str(posting.title) || out.title
    out.company = str((posting.hiringOrganization as Record<string, unknown>)?.name) || out.company
    const loc = posting.jobLocation as Record<string, unknown> | Record<string, unknown>[] | undefined
    const first = Array.isArray(loc) ? loc[0] : loc
    out.location = str((first as Record<string, unknown> | undefined)?.address) || out.location
    out.salary = str(posting.baseSalary) ?? out.salary
    out.description = str(posting.description) || out.description
    if (out.title && out.company) break
  }
  return out
}

function fromSelectors($: cheerio.CheerioAPI): Partial<Record<'title' | 'company' | 'location' | 'salary' | 'description', string>> {
  const pick = (...sels: string[]) => {
    for (const s of sels) {
      const t = $(s).first().text().trim()
      if (t) return t
    }
    return undefined
  }
  return {
    title: pick('h1', '.job-title', '[class*="job-title"]', 'title'),
    company: pick('.company', '.employer', '[class*="company-name"]', '[class*="employer"]'),
    location: pick('.location', '[class*="location"]', '.place', '.address'),
    salary: pick('.salary', '[class*="salary"]', '.pay', '.compensation'),
    description: pick('.description', '[class*="job-description"]', '[class*="description"]', '.details'),
  }
}

/** Agent-only link parsing with SSRF hardening: scheme allowlist,
 *  post-DNS private-IP blocking on every hop, redirect cap, timeout,
 *  2 MB body cap, HTML-only content type. */
export async function POST(req: Request) {
  const profile = await getAuthedProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role !== 'agent' && profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!rateLimit(`parse:${profile.id}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }

  const parsed = parseLinkSchema.safeParse(await readJson(req))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid http(s) URL' }, { status: 400 })
  }

  let html: string
  try {
    const res = await fetchCapped(parsed.data.url)
    html = await res.text()
  } catch (err) {
    const message = err instanceof Error && err.name === 'TimeoutError' ? 'Timed out fetching the link' : 'Could not fetch the link. Fill the details manually.'
    return NextResponse.json({ error: message }, { status: 422 })
  }

  const $ = cheerio.load(html)
  const extracted = { ...fromSelectors($), ...fromJsonLd($) }

  if (!extracted.title) {
    return NextResponse.json(
      { error: 'Could not auto-parse this page. Please fill details manually.' },
      { status: 422 },
    )
  }

  return NextResponse.json({
    title: extracted.title.slice(0, 300),
    company: extracted.company?.slice(0, 200) ?? '',
    location: extracted.location?.slice(0, 120) ?? '',
    salary: extracted.salary?.slice(0, 80) ?? '',
    description: extracted.description?.slice(0, 5000) ?? '',
  })
}
