# Jobkar — Final Plan (v7): Full Production Build with Skills, Tests, CI & Review Loop

## Architecture (one codebase, two modes)
Single Next.js 14.1 App Router codebase, one **private GitHub repo**. Server-side env flag `ENABLE_DASHBOARDS` read in middleware:
- **Public site (Vercel)** — flag off: middleware 404s `/dashboard/agent`, `/dashboard/admin`, `/api/admin/*`. Public pages + public API only.
- **Local dashboard app (your machine + friend's)** — `.env.local` flag on; `npm run dashboard`. Full agent + admin dashboards; both admin-role accounts.
- Friend setup: clone private repo → `npm install` → `.env.local` (anon key + flag; no service-role key leaves your machine) → login. Updates = `git pull`.
- Jobseeker `/dashboard`, `/login`, `/signup` stay on the public site. **Live sync** via Supabase Realtime on `job_listings`/`premium_purchases`/`site_settings`.
- Sensitive keys only in Vercel settings; local machines use anon key + role login + RLS + RPCs. Cost: ₹0/mo infra; ~2% Razorpay per sale.

## Skills loaded as guides (per phase)
- Build: `nextjs-app-router-patterns` (Phases 3–5), `react-state-management` (AuthContext), `typescript-advanced-types` (Phase 2), `nodejs-backend-patterns` + `api-design-principles` (Phase 4), `tailwind-design-system` (Phase 5).
- Security: `pci-compliance`, `secrets-management` (Phases 4, 7). Review inputs: `stride-analysis-patterns`, `security-requirement-extraction` (Phase 7).
- Design: `responsive-design`, `accessibility-compliance`, `visual-design-foundations` (Phase 5).
- Testing: `javascript-testing-patterns` (new Phase 6.5).

## Phase 0 — Repo & dependencies
`npm install @supabase/supabase-js @supabase/ssr cheerio razorpay zod recharts` + `npm install -D vitest`. `.gitignore`, `.env.local` (placeholders + flag), `.env.example`, `README.md`, `vercel.json` (daily cron), `git init` + initial commit; **`.github/workflows/ci.yml`** — GitHub Actions: on every push run `tsc --noEmit`, `npm run lint`, `vitest run`, `npm run build` (flag-off config). Protects both machines from broken pulls. Delete dead `styles/globals.css`, `data/jobs.ts`, `data/referrals.ts`, `contexts/PremiumContext.tsx`, `contexts/DataContext.tsx` after migration.

## Phase 1 — Database (`supabase/schema.sql` + `seed.sql`)
Tables: `profiles` (+ bank columns), `job_listings` (+ contact_info, is_featured, featured_until, expires_at), `premium_purchases` (+ order_id, **unique payment_id**, commission_status enum pending|available|withdrawn|voided), `withdrawal_requests`, `site_settings` (prices, commission_tiers jsonb, withdraw_threshold, job_ttl_days, featured_days).
RLS policies: `is_agent()`/`is_admin()` SECURITY DEFINER helpers; job_listings public SELECT approved+unexpired, agent INSERT/SELECT own, admin ALL; profiles SELECT own + bank-via-RPC, admin ALL; purchases SELECT own, admin ALL; withdrawals SELECT/INSERT own, admin ALL; settings public SELECT, admin ALL. `public_jobs` view (safe columns only) granted to anon.
Transactional RPCs: `process_payment` (idempotent, expiry=max(current,now)+duration, tiered commission, no self-referral), `update_own_profile` (bank only), `approve_withdrawal` (atomic), `release_commissions` (conditional 15-min flip), `void_commission`, `update_site_settings`.
`handle_new_user` trigger (referral-code retry, full_name from metadata). Seed: 12 jobs migrated (premium→is_premium, expiry set, some featured), settings row, admin-creation instructions.

## Phase 2 — Lib layer
`lib/database.types.ts` (typed via typescript-advanced-types guidance), `lib/supabase.ts`, `lib/server.ts` (cookie `createServerClient` + service-role + `getUserFromRequest` — fixes 401 bug), `lib/settings.ts`, `lib/validation.ts` (zod), `lib/rate-limit.ts`, `lib/toast.tsx`, `lib/plans.ts`.

## Phase 3 — Auth & middleware
Rewrite `contexts/AuthContext.tsx` (react-state-management guidance: real session restore, onAuthStateChange, profile fetch, authLoading gate). `middleware.ts`: `@supabase/ssr` updateSession pattern; flag-off 404s; role gates. `app/layout.tsx`: AuthProvider only.

## Phase 4 — API routes
Public (Vercel): `jobs/[id]` (contact_info for valid premium only), `settings` GET, `create-order` (**price from site_settings server-side, never from body**), `verify-payment`, `razorpay-webhook` (raw-body HMAC + timingSafeEqual; captured→amount check+process_payment; refunded→void; idempotent; pci-compliance guidance: no sensitive data in logs), `withdrawals` POST/GET (server-side balance math), `cron/release-commissions` (CRON_SECRET-guarded).
Local-only: `agent/parse-link` (SSRF guards: scheme allowlist, private-IP block post-DNS, redirect cap, 10s timeout, 2MB cap, text/html; JSON-LD then cheerio; 422 manual fallback), `agent/submit-job`, `agent/renew-job`. Admin ops via direct RLS queries + RPCs.

## Phase 5 — Pages & components (design skills active)
Public: `/login`, `/signup`, `/jobs` (featured first, filters, load-more, skeletons, error+retry, expiry-aware premium gating), `/jobs/[id]` (generateMetadata SEO + premium contact unlock), `/sitemap.ts`, `/robots.ts`, `/pricing` (settings-driven, Razorpay script loader, verify-payment polling), `/dashboard` jobseeker, `/profile`, landing (live data + real stats). Navbar role-aware.
Local: agent dashboard (link→parse→editable JobForm→submit; status pills, admin notes, renew, expiry countdown, Realtime). Admin tabs: Pending Jobs, Manage Jobs, Purchases (+CSV), Withdrawals, Agents, Analytics (recharts), Settings.
Mobile-first responsive polish (responsive-design), WCAG fundamentals (accessibility-compliance), consistent visual tokens (visual-design-foundations). Components fixed: WithdrawalModal, BankConnectModal, JobCard, BlurredJobCard, PricingCard; toasts everywhere.

## Phase 6 — Build verification
`npx tsc --noEmit`, `npm run build`, `npm run lint` — pass in both flag configurations; dev smoke test (dashboards render locally; public mode 404s admin surfaces; middleware redirects).

## Phase 6.5 — Automated tests (NEW)
- **vitest unit tests for money math** (javascript-testing-patterns): commission tier calculation (incl. tier fallback + rounding), premium expiry extension (`max(current, now)+duration` — re-buy never shortens), withdrawal balance math (available incl. lazy-15-min − pending ≥ amount, threshold), plan lookup from settings, referral-code validation regex, webhook amount verification helper.
- **browser-use web-gui-tester E2E** against the local dev server: signup → login → browse jobs → paywall on premium → (mock-Razorpay path documented) → jobseeker dashboard shows referral code → agent parse/submit → admin approve → job visible on public feed → settings change reflected in pricing. Each flow verified in a real browser, results reported per scenario.

## Phase 7 — Review loop (per-file + specialist agents)
1. **Inventory**: `git diff --name-only` vs initial commit.
2. **Per-file review** (code-reviewer agents in parallel batches): schema/RPCs, lib+middleware+auth, API routes, public pages, local dashboards.
3. **Specialist passes** (fed by stride-analysis-patterns + security-requirement-extraction outputs): `threat-modeling-expert` (STRIDE over auth, webhook, commissions, withdrawals, SSRF, RLS bypass), `frontend-security-coder` (XSS from scraped content), `typescript-pro` (schema + queries, zero `any`), `javascript-pro` (async/error handling), `accessibility-expert` (WCAG on public pages).
4. **Fix loop**: fix all Critical/Should-Fix; re-run tsc/build/lint/tests; re-review changed files; repeat until clean.
5. **Final gate**: `code-review-preshipment` → SHIP / SHIP WITH FIXES / DO NOT SHIP; only clean SHIP completes.
6. Consolidated review report delivered with handoff.

## Phase 8 — Docs & QA
README: both-machine setup, Supabase steps (schema→seed→email provider→admin accounts), Razorpay keys+webhook, Vercel deploy (flag off), private-repo push + CI explanation, expanded QA checklist (signup/login, blur+unlock, test purchase, referral commission after 15 min, agent parse/submit/renew, admin approve→agent sees live, featured order, settings→pricing reflect, expiry, withdrawal math, webhook idempotency, refund, cron, CSV, SEO, running tests locally).

Execution still waits for your explicit go — approving this plan updates the blueprint only.