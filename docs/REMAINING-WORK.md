# Compliance Build — Remaining Work

> Status snapshot saved 2026-09-07. The compliance build (plan:
> docs/COMPLIANCE-PLAN.md) is **code-complete, reviewed, tested, and
> committed locally** — NOT yet deployed. This file is the execution list for
> a fresh session. Verify state first (step 0), then execute in order.
>
> Live-site status during this window: production runs `88e7a31` (the last
> pushed commit — pre-compliance). The live **database** already carries ALL
> the new schema (see step 0) — the site and DB are intentionally out of sync
> until step 1.

## State at save time

- Local `main` is **ahead 3** of `origin/main` (origin at `88e7a31`). The
  three unpushed commits, newest first:
  - `41249e3` fix: review fixes (locked-title leak, smoke needle, honest perks)
  - `baf1911` feat: the full compliance build (32 files, +923/-82)
  - `af89740` docs: compliance build plan (12 points)
- Quality gates all green at last run: `npx tsc --noEmit` clean, vitest
  **105/105**, `npx next lint` clean.
- Two review agents ran over the build (code-reviewer + preship): final
  verdict **SHIP WITH FIXES**; every listed fix has been applied and
  committed in `41249e3`.

## Step 0 — Fresh-session state check (do not skip)

1. `git log --oneline -4` — expect `41249e3`, `baf1911`, `af89740`, `88e7a31`.
2. `git status` — expect clean.
3. `npx vitest run` — expect 105 passing (fast sanity that the checkout is whole).
4. Live DB sanity (Management API helper `~/.zcode/tmp/sq.mjs`; PAT in
   `~/.zcode/cli/config.json`):
   - `select string_agg(column_name, ',') ... where table_name='profiles'` —
     must include `pan_number, terms_accepted_at, bank_last4`.
   - `select proname from pg_proc where proname='update_own_profile'` —
     exactly ONE row (4-arg, with `coalesce(upper(p_pan), pan_number)`).
   - `pg_policies where tablename='reports'` — insert-own + operator-read only.
   - `has_table_privilege('anon','public.reports','SELECT')` = false.
5. Confirm `supabase/live-fixes/2026-09-06-bank-column-grants.sql` exists but
   is NOT yet applied (it must wait until after step 2's smoke):
   `select has_table_privilege('authenticated','public.profiles','SELECT')` —
   must still be TRUE at table level (grants not yet narrowed).

## Step 1 — Deploy the code (the load-bearing order)

1. `git push origin main` → Vercel builds automatically (jobkarbe.vercel.app).
2. Watch the Vercel deploy finish (or `gh`/dashboard), then run the extended
   smoke: `node scripts/smoke.mjs` (env: SUPABASE_URL + ANON key in
   `.env.local`-style vars; script reads `SUPABASE_URL`/`SUPABASE_ANON_KEY`
   or NEXT_PUBLIC_ variants).
   - Expect ALL PASS, including the new checks: `/grievance` 200, the 7
     copy needles (launch price, refund ladder, 18+ checkbox, operatorOP,
     Mumbai, IFSC, 48 hours), report-control presence on `/jobs/[id]`, anon
     denied on `/reports`.
   - If smoke fails: STOP, diagnose, fix forward — do NOT proceed to step 2.
3. Manual spot-checks on prod (browser or curl):
   - `/pricing` shows no strike-through MRP, launch-price badge present.
   - `/signup` shows the 18+/terms checkbox; submit disabled until checked.
   - A job detail page shows "Report this listing".
   - `/api/settings` JSON contains NO `mrps` key.

## Step 2 — Apply the bank column grants (ONLY after step 1 smoke passes)

Deploy order is load-bearing: explicit-column-list code must be serving
traffic before the grants land, or old bundles (select('*')) start erroring.

1. `node ~/.zcode/tmp/sq.mjs --file supabase/live-fixes/2026-09-06-bank-column-grants.sql`
2. REST-verify the lock:
   - authed-ish check via anon key on `profiles` → 401/403 (anon never had it).
   - The real proof is behavioral (step 3): a logged-in browser must still
     load the dashboard, and `bank_account_number` must be unreachable.
   - SQL check: `select has_table_privilege('authenticated','public.profiles','SELECT')`
     → false at table level; column grants listed in
     `information_schema.column_privileges` for authenticated = the 12 safe
     columns exactly.
3. Re-run `node scripts/smoke.mjs` — still all-pass (site must not depend on
   the raw columns anywhere; the 105-test suite + source-invariant tests
   already assert this).

## Step 3 — Bank-fix end-to-end verification with a real account

Chrome automation on this machine: launch via
`cmd //c start chrome.exe --new-window`, activate by window title+pid, drive
by a11y tree (AXPress over coordinates; screenshots are not model-visible —
verify via accessibility tree / SSR HTML / logs). See memory
`reference-chrome-automation`.

1. Sign in with the test jobseeker account (Test Buyer / known creds; the
   operator account is `9818910a-…`).
2. Dashboard → Connect Bank Account → fill holder / account / IFSC / PAN →
   save. Expect: toast "Bank account connected".
3. Dashboard now shows `•••• XXXX` (the REAL last4, not `•••• 0000`).
4. Verify server-side the row: `select bank_last4, pan_number,
   terms_accepted_at from public.profiles where email='<test account>'` —
   last4 matches the entered account's tail, PAN uppercase present.
5. Confirm the browser cannot read the full number: in devtools network,
   the profile fetch response must contain only the safe columns (no
   `bank_account_number` key anywhere), and
   `fetch('/api/withdrawals')` returns rows WITHOUT `bank_*` fields.
6. If anything breaks here, the rollback is: re-grant table-level select —
   `grant select on public.profiles to authenticated;` (documented at the
   bottom of the grants file's intent; grants file shows the revoked form).

## Step 4 — Post-deploy health + sign-off

1. `prod-logs-health-check` agent (or Vercel log scan): errors/warnings
   since deploy; specifically watch for `report insert failed` (the new
   console.error) and any 4xx/5xx spikes on /api/reports, /api/settings.
2. File one real report from the test account (Report this listing → send),
   verify the row lands: `select * from public.reports order by created_at
   desc limit 1` — reason + note + job_id correct. This also validates the
   RLS insert-own path end-to-end on prod.
3. Sign-up flow once with a fresh email: checkbox → confirm email → login →
   `select terms_accepted_at from public.profiles where email='…'` NOT null
   (validates the consent trigger on prod).
4. Update docs/COMPLIANCE-PLAN.md status header (mark BUILD COMPLETE) — or
   leave as historical and note completion in the next session's memory.

## Step 5 — Memory + close-out (mandatory, see standing rules)

1. Update memory `jobkar-legal-compliance-audit.md`: build executed, live
   commits `baf1911` + `41249e3`, grants applied, what remains deferred
   (docs/compliance-triggers.md items).
2. MEMORY.md index line already points there — refresh its hook text.
3. Optional but recommended: note the sequencing gotcha (grants last) in the
   memory body so no future session re-introduces a select('*').

## Guardrails for the fresh session (from standing rules)

- Preship review agent before ANY deploy — already done for this exact
  tree (verdict SHIP WITH FIXES, fixes applied). If step 0 shows the tree
  changed since `41249e3`, re-run preship before pushing.
- Prod smoke after every deploy (step 1.2, step 2.3).
- SQL via the Management API helper only; never hand-back a manual runbook.
- User keeps only judgement steps (none outstanding for this build).
- No Razorpay LIVE / credential work anywhere in this plan.

## Explicitly out of scope (tracked in docs/compliance-triggers.md)

GST registration, TDS computation/display, incorporation, cookie banner,
self-serve export/delete APIs, trademark, DPAs, breach runbook beyond the
one-pager, accessibility pass, analytics.
