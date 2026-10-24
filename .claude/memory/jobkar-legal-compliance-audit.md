---
name: jobkar-legal-compliance-audit
description: Compliance build DEPLOYED 2026-09-07 (all steps executed, grants applied,
  verified live) + ₹500 withdraw minimum same-session; gotcha = Vercel Data Cache froze
  supabase-js settings fetches across deploys (fixed via global.fetch no-store) and
  column grants require explicit-column-list code (never re-add select('*'))
metadata:
  node_type: memory
  type: project
  originSessionId: sess_5a399726-1cb0-40eb-85ff-77f2f6e83229
---

Full Indian-jurisdiction compliance audit delivered 2026-09-06 (jobkarbe.vercel.app). Operator identity decided by user 2026-09-07: **"operatorOP", Mumbai, Maharashtra, no public phone**. The 12-point plan (docs/COMPLIANCE-PLAN.md, `af89740`) was built, then **DEPLOYED + VERIFIED 2026-09-07 — the build is DONE and LIVE**.

**Deploy execution (2026-09-07, executed per docs/REMAINING-WORK.md — that doc is now historical/stamped):** push `7ee79b8..8462e32` + docs close-out `d8152c6`; smoke all-pass 3× (23 checks incl. all 7 compliance needles, /grievance 200, anon 401 on /reports + /public_jobs, locked rows clean). **Bank column grants APPLIED to live DB** (revoke table-select on profiles from authenticated; grant exactly the 12 safe columns) after the explicit-column build was live — order was load-bearing. Verified behaviorally: Test Buyer dashboard loads (grants-safe code path), bank save works, dashboard shows the REAL `•••• 9012` (fake `•••• 0000` mask gone), DB row holds last4/PAN/IFSC, and a hostile user-JWT select of `bank_account_number` / `select=*` → **403**. Reports E2E: filed one report from the real browser session (fake_scam, RLS insert-own works), row verified, then deleted (0 rows left — don't leave false reports in the operator queue). Consent trigger verified with a fresh signup (`terms_accepted_at` stamped); test account deleted after (auth.users delete cascades profiles). Health probe post-deploy: zero 5xx, clean 401 gates on new endpoints.

**Same-session user request — withdraw minimum is now ₹500** (was ₹1): set `site_settings.withdraw_threshold='500'` (dashboard-editable). Surfaced a **latent money-path bug**: /api/settings kept serving the old value because (a) the GET route read no request data so Next prerendered it static at build time (fixed: `export const dynamic='force-dynamic'`, `f90b1e8`), and (b) deeper: supabase-js's internal fetch was cached in **Vercel's deploy-persistent Data Cache** — force-dynamic alone did NOT fix it (fixed: `global: { fetch: noStoreFetch }` wrapper on adminClient/createRouteClient/middleware clients, `8462e32`). Reviewer verified supabase-js always passes URL strings (cache option honored) and no other route has the static-prerender problem. RPC `request_withdrawal` reads the threshold live per call (was already enforcing 500 before the display caught up).

**Standing gotchas:** 1) Never re-introduce `select('*')` on profiles from authenticated clients — table-level select is revoked; a rollback needs `grant select on public.profiles to authenticated;`. 2) Any new DB-reading GET route handler that reads no request data gets prerendered STATIC by Next 14 — add force-dynamic (repo convention, see app/api/settings/route.ts). 3) supabase-js fetches must always go through the no-store wrappers in lib/server.ts (Data Cache survives deploys). 4) Locked premium job titles must never be passed to client components (RSC payload leak, fixed `41249e3`); smoke needles must match rendered copy verbatim.

**Test Buyer account (e2e.buyer.test@gmail.com) password was reset to `JobkarE2E!2026` for the e2e pass — user may want to change or keep.** Chrome login flow + bank save driven via a11y tree (element AXPress/set_value), works well.

Deferred-with-triggers: docs/compliance-triggers.md (GST, TDS 194H at ~₹18k/FY referrer, incorporation, cookie banner only when analytics ships, self-serve export/delete, trademark). Substantiation: docs/listing-review-sop.md. Both docs/COMPLIANCE-PLAN.md and docs/REMAINING-WORK.md are stamped BUILD COMPLETE.

Related: [[feedback-trust-enforcement]], [[project-jobkar-rebuild]], [[reference-supabase-access]], [[reference-chrome-automation]], [[feedback-self-serve-ops]]
