---
name: project-ux-audit-gap
description: 2026-08-22 UX/CRO audit gap analysis — legal/trust cluster fixed
  (61dc3fc); paywall server-side hole + copy/polish items were open;
  2026-08-23 fix plan designed + agent-validated → [[jobkar-hardening-plan]]
metadata:
  node_type: memory
  type: project
  originSessionId: sess_0cfcaa79-9cb1-467a-b9db-f284d92e53ed
---

User supplied an external UX/UI & conversion audit (`C:\Users\SHARDA BHOSALE\Downloads\jobkar-ux-cro-audit.md`, dated 2026-08-22; written against the repo just before `61dc3fc`, so some findings were stale). On 2026-08-22 I re-verified every finding against current code via 3 explore agents and delivered a **report only** — user explicitly said "just tell me don't do anything else". Fix go-ahead followed on 2026-08-23: the complete six-phase remediation plan is [[jobkar-hardening-plan]] (agent-validated; execution not started).

**Already fixed (audit was stale here):** Terms/Privacy/FAQ/Contact pages live with real content (`61dc3fc`); footer Support links + "Job Providers" CTA point to /contact; support path exists (`jobkarsupport@gmail.com`, 24–48h reply promise).

**Still open — CRITICAL (revenue leak):** paywall is cosmetic server-side. `public_jobs` view (schema.sql:205-214) grants unredacted select — title/company/description/**apply_url** — to `anon`; homepage + /jobs are `'use client'` fetching straight from the browser, CSS blur applied AFTER payload arrives. PaywallModal oversells ("full details, salary") — salary renders for everyone, description renders unconditionally incl. JobPosting JSON-LD; only contact_info + apply link are truly withheld. No API route/RPC anywhere serves an entitlement-filtered job list (6 routes under app/api/ never touch public_jobs).

**Still open — quick wins:** hardcoded `<StatsCounter value={98} label="Success Rate">` next to live counters (app/page.tsx:141); referral-led hero ("Earn Rewards by Referring", page.tsx:59-68) + signup copy; BankConnectModal says only "Enter your bank details for withdrawals." — no payouts-only reassurance or privacy link; no OG tags/image anywhere AND no `public/` dir at all; no skip-to-content link (layout.tsx:25); Clock icon on salary_range (components/JobCard.tsx:53); saved/applied still localStorage-only (lib/savedJobs.ts, keys `jobkar:saved`/`jobkar:applied`; cbc026e's "save/applied tracking" = structured localStorage, NOT Supabase — no tables exist).

**Still open — long-term:** server-side redaction (top priority); gate description on detail page (decide JSON-LD/Google-Jobs tradeoff first); RSC/ISR for home+/jobs (currently post-hydration fetch + 3 count queries); Realtime socket on /jobs (listens to `jobs_version` bump table); NO Razorpay webhook self-heal — only Razorpay 5xx retries + a code comment admitting failed deliveries need "manual reconciliation"; checkout polls ~30s then error-toast with no support-email mention; visual identity unchanged (default Tailwind blue-600 #2563EB/orange-500 #F97316, Inter only, zero imagery); no i18n/Hindi (`lang="en"` hardcoded); tier-perk delivery capacity = business decision for user.

Also noted: website tests are 45 vitest units covering filters/money/validation but ZERO paywall/checkout coverage. Local layout fact confirmed this session: the website repo root IS `C:\Users\SHARDA BHOSALE\OneDrive\Desktop\jobkar` directly (no nested portfolio folder); the operator dashboard is the `app/dashboard` route inside that same local repo.

**"Unfiltered" audit variant:** on 2026-08-23 the user pasted a blunter rewrite of the same audit ("Jobkar — UX/UI & Conversion Audit (Unfiltered)") and asked whether everything in it was already covered. Verified line-by-line against [[jobkar-hardening-plan]]: ZERO new technical findings — every item either already fixed (`61dc3fc`) or mapped to a specific plan phase; only deliberate exclusions = full photography identity (future work), Hindi i18n (deferred), tier-perk delivery capacity (user's business call).

The original recommendation (redaction first, then cheap trust wins, identity+i18n last) is exactly the ordering [[jobkar-hardening-plan]] implements — scope decisions locked there: salary free, light brand refresh now, i18n deferred, no purchase ledger. Related: [[project-jobkar-rebuild]], [[project-review-queue]], [[feedback-quality-first]].
