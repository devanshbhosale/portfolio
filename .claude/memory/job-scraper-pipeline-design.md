---
name: job-scraper-pipeline-design
description: Jobkar scraper architecture — generic any-website pipeline with
  Gemini fallback and per-site profile registry; 2026-09-26 verdict on user's
  freehire_scraper.zip vs existing engine
metadata:
  node_type: memory
  type: project
  originSessionId: sess_6c20739e-3d54-4f65-bbfe-ccf1be42136e
---

Jobkar's job-listing scraper (in the desktop dashboard app) is a **generic pipeline that works on any website**, not tied to any single source.

**Pipeline (scraper-first):**
1. Hardened fetch: SSRF guards, DNS pinning via undici Agent, CIDR blocklists (private/loopback/link-local/multicast/6to4/documentation ranges), redirect cap, timeout, 2MB + HTML-only limits. **CRITICAL BUG FIXED (2026-08-21):** IPv6 blocklist entry `::ffff:0:0/96` was matching ALL IPv4 addresses via IPv4-mapped form — blocking every public site. Removed from `fetch.ts` blocklist; regression test in `test/fetch.test.ts` (resolves private IPs → throws, scheme gate passes).
2. cheerio + JSON-LD `JobPosting` + smart selectors → title/company/location/salary/experience/description/tags/contact/**apply_url** (generic apply-link heuristics).
3. Optional **per-site profile registry**: known sites get a tuned extraction flow that overrides the generic one. See [[thejobcompany-scraping-profile]].
4. **Gemini fallback** (only when neither profile nor selectors structure the page): page text ≤12k chars → `gemini-2.0-flash` fixed JSON response schema → same fields. On Gemini failure/quota → cheerio output → manual-entry form.
5. Every output passes `submitJobSchema` zod validation + `safeExternalUrl` before insert as `pending_review`.

**apply_url** is a first-class field (distinct from `source_link`): the public site's "Apply now" CTA points at it; `source_link` is source attribution.

**ScraperAPI is NOT used anywhere** — rejected (paid). If LinkedIn/Indeed/Glassdoor ever become targets and their anti-bot walls block the generic fetcher, that's the point to revisit a paid transport. Not now.

**Bulk input**: paste many job links and/or a listing page URL. **Auto-enumeration of listing pages is PROFILED-SITES ONLY** — a registered profile's listing page splits into one unit per job card (max 100/page) with per-host politeness (2–4 in-flight, 250–500ms delay). For NON-profiled sites a listing/search-results page is treated as ONE unit and extracted as a single job — usually badly; the generic path expects an individual job-posting URL (user asked "shouldn't it scrape any link?" 2026-08-21 — yes, any single job page works via profile→generic→Gemini chain, but multi-job pages need a profile). If a new source site becomes a heavy target, add a profile in `src/lib/scrape/profiles/` + one registry line.

See [[thejobcompany-scraping-profile]] and [[project-jobkar-rebuild]].
