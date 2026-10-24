---
name: smart-search-plan
description: Smart Search v3 — EXECUTED & LIVE 2026-08-29 (commit bb8b4b1); plan
  file kept as record of what shipped and what was found
metadata:
  node_type: memory
  type: project
  originSessionId: sess_4ba89f10-fa6d-47ec-bbae-0f32892bc605
---

# Smart Search v3 — LIVE (executed 2026-08-29, commit `bb8b4b1`)

The approved v3 plan (2026-08-28) was executed verbatim in full and verified live. Related: [[jobkar-hardening-plan]], [[feedback-trust-enforcement]], [[feedback-self-serve-ops]], [[reference-supabase-access]].

## What shipped
- DB: `pg_trgm`, 4 facet columns on `job_listings` + `public_jobs` view, `parse_job_facets` trigger (ports parseSalaryRange; LPA÷12, k×1000, leading-digit regex anchors), one-shot backfill, 3 GIN trgm indexes, `search_jobs` + `suggest_job_query` SECURITY DEFINER RPCs (service_role-only grants). Migration file: `supabase/live-fixes/2026-08-28-smart-search.sql`; `schema.sql` mirrored to **v11**.
- TS: `lib/searchTokens.ts` (tokenizer + location alias groups incl. the "banglore" misspelling + salary/exp buckets), `lib/jobsQuery.ts` v2 (`buildSearchArgs`, whitelisted salary/exp/posted/sort params, `SearchFacets`), `lib/jobsFilters.ts` v2 (`apiParams()` strips tier=saved; `filtersFromParams` whitelist-validates bucket params), route → RPC, jobs page fully server-filtered (300ms debounce, facets/counts, chips, recents `jobkar:recent-searches`, did-you-mean), `components/HomeSearch.tsx` hero form.

## Pre-ship review found 2 blockers (both fixed, worth remembering)
1. Sending `tier=saved` to /api/jobs 400s — Saved tier is client-side only; fix = `apiParams()` deletes tier before fetch.
2. `regexp` on free-text salary crashed on strings like "negotiable, 20000" (`[\d,]+` matches a lone comma → `''::numeric` raises) — would have broken `submit_job` and the backfill; fix = leading-digit anchors `(\d+(?:\.\d+)?)` / `(\d[\d,]*(?:\.\d+)?)` + int clamp.

## Live-verified facts
- 510 jobs; **only 12 carry salary/experience text** → experience/salary facet counts are dominated by unknown rows matching every bucket (documented semantics — labels show filter outcomes honestly).
- "banglore" → 2 jobs via location variants; salary sort → top ₹40k job; garbage q → clean total 0; `?page=300000000` → clamped 200; anon 401 on both RPCs + view.
- 96 tests, tsc/lint clean, `next build` clean, prod smoke all-pass (incl. premium-leak check).

## Not in this pass (unchanged from plan)
Semantic/vector search, Gemini NL parsing, personalized ranking, approved-row dedup, autocomplete dropdown. Possible follow-up: TS `parseSalaryRange` still lacks the k-suffix rule the SQL trigger has (SEO structured data shows 20 for "20k-30k").
