# Listing Review SOP

How a job listing becomes "reviewed and approved by our team" (the claim on
the homepage). This is the substantiation record for that claim.

## Pipeline (all listings pass through this)

1. **Source check** — every listing originates from a public career page or
   public job board, captured with the site's source URL. No gated or private
   content is collected.
2. **Operator approval** — listings land as `pending_review` and only an
   operator action moves them to `approved`. Nothing goes live automatically.
   Approved listings carry `approved_at` + `approved_by`.
3. **Freshness TTL** — approved listings auto-expire after the configured
   TTL (default 30 days; `site_settings.job_ttl_days`) unless renewed.
   Expired listings disappear from the public site.
4. **Stale detection** — when the source posting is found to be pulled, the
   listing is marked stale and hidden from the public site.
5. **Dedupe** — the ingestion pipeline dedupes against existing listings.
6. **Contact validation** — HR contact details are carried only when present
   on the source posting; they are shown to entitled premium users only.
7. **Discrimination screen** — listings asking for money to apply or carrying
   discriminatory requirements are rejected at review or reported via the
   reports pipeline.

## Post-live reports (since 2026-09-06)

- Users can flag any live listing: **Report this listing** on the job page
  (signed-in; signed-out users get the mailto fallback).
- Reports land in the `reports` table with reason + optional note.
- Triage target: act on valid reports within **36 hours** (IT Rules 2021
  R.3(2) discipline) — set the listing stale (`set_job_stale`) or delete it
  (`delete_job`) when the report is confirmed.

## Known limits (kept honest)

- Salary text appears only when the employer publishes it; most listings
  carry none. We never invent or estimate salary numbers.
- We do not guarantee a listing is still open at the moment you view it —
  always verify on the official company site (also stated in Terms).
