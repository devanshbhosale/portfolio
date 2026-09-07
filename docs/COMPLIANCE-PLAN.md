# Jobkar Compliance Build Plan

> Status: **BUILD COMPLETE & DEPLOYED — 2026-09-07.** Commits `baf1911` + `41249e3`
> pushed (`7ee79b8` was already on top), followed by the ₹500 withdraw-threshold change
> (`f90b1e8` force-dynamic on /api/settings + `8462e32` no-store fetch on all server-side
> Supabase clients + the DB row). Bank column grants applied to the live DB and verified
> behaviorally (dashboard loads; raw bank columns 403 for user JWTs). Consent trigger and
> reports RLS insert-own verified end-to-end on prod; test artifacts (report row, consent
> account) deleted after verification. Remaining deferred items live in docs/compliance-triggers.md.
>
> Basis: the trimmed 12-point plan approved 2026-09-06, refined with exact file:line facts from an
> Explore agent pass, plus three user decisions: **MRP → launch-price relabel**,
> **identity details supplied at build time**, **bank fix → full fix** (real mask + browser can
> never read the full account number).
>
> Operator identity as built: **operatorOP / Mumbai, Maharashtra** (user-set 2026-09-06).

---

## Phase 0 — Save & stop
Write this plan to `docs/COMPLIANCE-PLAN.md`, commit as `docs: compliance build plan (12 points)`, end.
Nothing else runs until the "build this plan" command.

## Phase 1 — Copy & legal pages
One commit: `feat: legal compliance — honest claims, policies, grievance, consent`

### 1. Kill false claims
The hero promises "salary details upfront" but only ~12 of ~510 jobs carry salary text — a
front-page claim the product contradicts (CPA 2019 misleading-ad exposure; violates the
never-invented-numbers standing rule).

- `components/HomeAnimated.tsx:41` — hero subtitle: "salary details upfront" → "salary details
  where employers share them".
- `app/layout.tsx:16-17` — meta description says "salary details upfront"; same fix.
- `lib/plans.ts:68` — `SHARED_FEATURES` "Know real salaries before applying" → "Salary details
  where employers share them".
- Keep "Verified Listings" / "Every job is reviewed and approved by our team"
  (`HomeAnimated.tsx:68`) — substantiated by the approval flow; defence doc lands in point 12.
- Referral disclaimers under `HomeAnimated.tsx:69`, `app/dashboard/page.tsx:103`, and the
  referral FAQ answer: "Earnings depend on purchases made with your code — not guaranteed income."

### 2. Privacy policy rewrite (`app/privacy/page.tsx`)
- "What we collect" gains bank details: holder name, account number, IFSC — collected via the
  bank-connect form (stored through the `update_own_profile` RPC), used solely to send referral
  payouts, never shared.
- **Truthful cookie section:** essential session cookies only today — no analytics tooling
  exists in the codebase. If analytics is ever added, a consent banner ships with it.
- Named processors: Vercel (hosting), Supabase (database), Razorpay (payments), Google/Gmail
  (support email). Note: Razorpay processes payment data; card details never touch Jobkar servers.
- Cross-border disclosure: data processed in the US (Vercel/Supabase infrastructure).
- Retention: account data until deletion; payment records ~8 years for tax law.
- 18+ policy (service is for adults; minors' accounts are terminated on discovery).
- Breach commitment: notify the Data Protection Board and affected users without delay.
- Rights with 30-day response SLA; how to withdraw consent.
- Third-party channel: HR/employer contact-removal requests via the grievance officer email.

### 3. Terms surgical edits (`app/terms/page.tsx`)
- Contracting party identified: operator name + city (slot filled at build time).
- Governing law: "laws of India; exclusive jurisdiction of the courts at [city]".
- Define Lifetime: "for as long as Jobkar operates the service".
- Explicit line: "Jobkar charges for platform access; you never pay to apply for a job."
- CPA carve-out: nothing in these terms limits rights under the Consumer Protection Act 2019.
- Refund/referral clauses aligned with the new ladder (below).

### 4. Refund ladder on pricing (`components/PricingPlans.tsx:267-270` footer area)
Second paragraph: instant digital delivery; refunds for (a) wrong/duplicate charge,
(b) payment failure before premium unlock, (c) technical defect preventing access — reviewed
within 48 hours, refunded within 5–7 working days via the original payment method; link to the
grievance page. Not blanket-refusable; "non-refundable" language retired from FAQ/Terms.

### 5. MRP → launch price (`components/PricingCard.tsx:23,43-51`)
- Remove the strike-through `₹{mrp}` line (line 43-45) and the "Save {savingsPct}%" pill
  (lines 47-51) — an advertised discount off a price never charged is an imaginary reference
  price under the CPA Misleading Ads Guidelines 2022.
- Add a "Launch price — increases as Jobkar grows" badge.
- DB `mrps` columns + settings plumbing stay (harmless); the pricing UI simply stops rendering
  them. Any tests referencing MRP rendering get updated.

### 6. Footer identity + `/grievance` page
- `components/Footer.tsx` — identity block: "Operated by [name], [city] · jobkarsupport@gmail.com
  · [phone]" + a "Grievance" link in the Support column.
- New `app/grievance/page.tsx`: grievance officer = operator (name, contact), the process
  (email → ticket reference issued → acknowledgement within 48 hours → resolution within 15
  days), escalation path.
- `app/sitemap.ts` staticRoutes gains `/grievance`; cross-link from `app/contact/page.tsx`.

### 7. Signup consent + 18+ (`app/signup/page.tsx`)
- Checkbox above the submit button: "I am 18 or older and agree to the
  [Terms](/terms) and [Privacy Policy](/privacy)." Submit disabled until checked.
- `app/login/page.tsx` (slot between lines 101-102): "By logging in you agree to our
  [Terms](/terms) and [Privacy Policy](/privacy)."
- Acceptance timestamp stored via `profiles.terms_accepted_at` (SQL lands in Phase 2 —
  sequencing below).

### 8. FAQ sync (`app/faq/page.tsx`)
- Refund answer → the ladder (replaces "non-refundable except where legally required").
- Delete-account answer → 30-day SLA.
- New Q: "Do I pay to apply for jobs?" — no; the fee covers platform access only.
- New Q: "Is Jobkar legitimate?" — charges for access, never for applications; legitimate
  employers never ask candidates for money.

---

## Phase 2 — Features
One commit + one SQL migration: `feat: report listing, PAN, bank-data lock, consent record`

### 9. Report this listing
- `app/jobs/[id]/page.tsx` — after the source-link block (~line 154): "Report this listing"
  control using the BankConnectModal modal pattern. Reasons: fake/scam · expired · asks for
  money · discriminatory · other, + optional note.
- New `POST /api/reports` — copies the `app/api/withdrawals/route.ts` pattern:
  `getAuthedProfile()` → 401; `rateLimit()` → 429; zod schema → 400; insert via
  `createRouteClient()` (RLS insert-own, matching the `job_marks` precedent).
- New `reports` table (RLS insert-own). Signed-out users get a mailto fallback.
- Toast on success (`lib/toast` hook).
- Anti-fraud note under `ApplyButton` on the same page: "Legitimate employers never ask for
  money. Jobkar charges only for platform access."

### 10. PAN at bank-connect
- `components/BankConnectModal.tsx` + new `panSchema` in `lib/validation.ts`
  (`^[A-Z]{5}[0-9]{4}[A-Z]$`, required).
- `profiles.pan_number` column; `update_own_profile` RPC gains `p_pan` arg.
- Rationale: collected at the exact moment payouts begin, so TDS never needs a retrofit.

### 11. Bank full fix (security upgrade)
Current state (verified): the full unencrypted account number is fetched by every logged-in
browser (`contexts/AuthContext.tsx:61-65` selects `*` from profiles, RLS allows reading own
bank columns); the dashboard shows a hardcoded fake mask `•••• 0000`
(`app/dashboard/page.tsx:88`); the withdrawals API also returns `bank_account_number`.
- SQL: `profiles.bank_last4` column; `update_own_profile` stores it alongside the full number;
  **column-level grants**: authenticated SELECT limited to safe columns (id, email, full_name,
  role, referral_code, premium_plan, premium_expires_at, bank_connected_at, bank_last4,
  pan_number, terms_accepted_at, created_at) — `bank_account_number`, `bank_ifsc`,
  `bank_holder_name` become unreadable by browsers. Service-role paths unaffected (bypasses
  grants, as before).
- Code: `contexts/AuthContext.tsx` `select('*')` → explicit safe column list; `toAuthUser`
  surfaces `bankLast4`.
- `app/dashboard/page.tsx:88` — real mask: `•••• ${bankLast4}`.
- `app/api/withdrawals/route.ts` GET → explicit safe columns (drops `bank_account_number`).
- **Deploy order is load-bearing:** push explicit-column-list code first (works under today's
  grants), then apply column grants, then verify with a real account (bank connect → dashboard
  mask → withdrawal history).

### 12. Substantiation + trigger docs
- `docs/listing-review-sop.md` — the approval flow already run (source check, freshness/TTL,
  dedupe, contact validation, discrimination screen). The defence file behind the "reviewed
  and approved" hero claim.
- `docs/compliance-triggers.md` — deferred items with exact triggers:
  - GST registration + tax-inclusive pricing → material revenue or practitioner consult.
  - TDS machinery (194H, 2%, ₹20k/FY) → any referrer approaching ~₹18k in a FY; PAN already
    collected makes this painless.
  - Incorporation → material revenue or hiring.
  - Cookie consent banner → the day any analytics tool is added.
  - Self-serve export/delete endpoints → real user volume (email + 30-day SLA is honest now).
  - Trademark filing; breach-runbook one-pager.

---

## SQL migration (one file, executed live + verified)
`supabase/schema.sql` + dated migration adding: `bank_last4`, `pan_number`,
`terms_accepted_at` columns on profiles; `reports` table + RLS; `update_own_profile`
extended (`p_pan`, `p_terms_accepted`); column-level grants on profiles. Executed live via the
Supabase Management API helper (`~/.zcode/tmp/sq.mjs`), then REST-verified (authed user can
select safe columns but NOT `bank_account_number`; anon blocked from `reports`). Hand-mirrored
into `lib/database.types.ts` (per its header comment).

## Sequencing (resolves the consent dependency)
Build Phase 1 copy + Phase 2 code/SQL together; deploy as two pushes.
Final order: **SQL migration → verify → Phase 1 commit/push → smoke → Phase 2 commit/push →
smoke.** SQL is additive/non-breaking for existing columns; grants ship last per point 11.

## Tests & ship process (standing rules, encoded)
- vitest: `test/validation.test.ts` gains panSchema + reportSchema cases; MRP-render tests
  updated; new test asserting `toAuthUser` maps `bankLast4` and never the full number.
- `scripts/smoke.mjs` additions (fetch-then-`check()` pattern):
  `/grievance` 200; `/pricing` contains "Launch price" + refund-ladder text; `/signup` contains
  the 18+/consent string; `/terms` contains governing-law string; `/privacy` contains the
  bank-data disclosure; `/jobs/[id]` (first job) contains "Report this listing"; anon REST on
  `reports` → 401.
- Agents/skills at build time: implementer for the copy-heavy Phase 1 files (or direct write —
  copy is judgment work); `feature-dev:code-reviewer` per commit; **`code-review-preshipment`
  before deploy** (standing preship rule); SQL via Management API helper (self-serve rule);
  post-deploy `prod-logs-health-check` + extended smoke; bank-fix verification with a real
  account via Chrome (a11y-tree verification per machine quirks).
- Deploy: push to main → Vercel → smoke cert. No Razorpay/live-credential work in this plan.

## Out of scope (tracked in docs/compliance-triggers.md)
GST registration, TDS computation/display, incorporation, cookie banner, self-serve
export/delete APIs, trademark, DPAs, breach runbook beyond the one-pager, accessibility pass,
analytics of any kind.

## What "build this plan" still needs from the user
1. Operator name + city/state (and phone if publishable) — the only content this plan cannot
   write.
2. Nothing else — every other decision is already made.
