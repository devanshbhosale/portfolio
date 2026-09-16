# Jobkar — Job Portal (Website)

A blue-collar job portal with premium listings, referral rewards, and operator-managed listings. Two repos make up the system:

| Repo | What it is | Tech |
|------|-----------|------|
| **`jobkar`** (this repo) | Public website + payments + referral dashboard | Next.js 14, Supabase (Postgres + Auth + RLS), Dodo Payments |
| **`jobkar-dashboard`** | Desktop operator control panel (Windows `.exe`) | Electron + React + Tailwind |

The website is the only public surface. All listing management (scrape → review → approve → withdrawals) happens in the **desktop app**, never on the public domain.

## Architecture

```
┌──────────────────────┐        ┌──────────────────────────────┐
│   Supabase Cloud     │        │  Dodo Payments (checkout +   │
│  Postgres + Auth     │◄───────┤  webhook → process_payment)  │
│  Realtime + RLS      │        └──────────────────────────────┘
└──────────┬───────────┘
           │
     ┌─────┴─────────────────────────────┐
     ▼                                   ▼
┌──────────────────────┐        ┌──────────────────────────┐
│  Vercel (Public)     │        │  Desktop app (operators) │
│  This website        │        │  jobkar-dashboard.exe    │
│  - jobs feed/detail  │        │  - scrape + AI fallback  │
│  - pricing + payment │        │  - review + approve      │
│  - referral dashboard│        │  - purchases + withdrawals│
│  - NO admin surface  │        │  - analytics + settings  │
└──────────────────────┘        └──────────────────────────┘
```

- **One DB, two clients.** Both repos share Supabase. The website is read-mostly; the desktop app is the write path.
- **Operator accounts.** Listing management is done by accounts with `role = 'operator'` (no `agent`/`admin` roles — see the split migration). Operators sign in to the desktop app, not the website.
- **Live sync.** The website subscribes to the `jobs_version` sentinel table via Supabase Realtime. When the desktop app inserts/updates/deletes a `job_listings` row, a trigger bumps `jobs_version`, and the website refetches immediately — no polling, no `ENABLE_DASHBOARDS` mode.
- **Secrets.** Website secrets (`SUPABASE_SERVICE_ROLE_KEY`, `DODO_PAYMENTS_*`, `DODO_PRODUCT_IDS`, `CRON_SECRET`) live only in Vercel project settings. The desktop app holds only `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `GEMINI_API_KEY`, and uses RLS + operator-gated RPCs.

## Cost

| Item | Cost | Notes |
|------|------|-------|
| Supabase Free | ₹0/mo | 500 MB DB, 50k MAU, ~2 verification emails/hour |
| Vercel Hobby | ₹0/mo | 100 GB bandwidth/mo, daily cron |
| GitHub Private | ₹0/mo | Both repos stay closed |
| Dodo Payments | Pay-as-you-go | Merchant of record — fee per transaction, they handle tax/compliance |
| Gemini API | Pay-as-you-go | Only for scrape-fallback parsing |
| Domain (optional) | ₹500–1,000/yr | e.g. `jobkar.in` |
| **When outgrown** | **Supabase Pro $25/mo** · **Vercel Pro $20/mo** | |

## Quick Start

### 1. Clone & Install

```bash
git clone <private-repo-url> jobkar
cd jobkar
npm install
cp .env.example .env.local   # fill in real keys (see below)
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com) → note `URL`, `anon key`, `service_role key`.
2. **SQL Editor** → Run `supabase/schema.sql` (tables, RLS, views, RPCs, trigger — v10).
3. **SQL Editor** → Run `supabase/seed.sql` (12 demo jobs + settings row).
4. **Authentication → Providers** → Enable **Email** (turn off "Confirm email" for local testing; keep ON for production).
5. Create operator account(s):
   - **Auth → Users → Add user** → email + password (e.g. `owner@…`).
   - **SQL Editor** → `update public.profiles set role = 'operator' where email = 'owner@…';`
   - These credentials go into the **desktop app**, not the website.

> Upgrading an existing pre-split database? Run `supabase/dashboard-patch.sql` once instead of `schema.sql`.

### 3. Dodo Payments Setup

1. Create an account at [app.dodopayments.com](https://app.dodopayments.com) and complete account verification.
2. In **Test Mode**, create three one-time products (Dashboard → Products): Weekly, Monthly, Lifetime — each priced to match your `site_settings` prices (₹99 / ₹199 / ₹999 by default).
3. **Developers → API Keys** → generate a Test API key (`dodo_test_…`).
4. **Developer → Webhooks → Add endpoint** → URL `https://<your-vercel-domain>/api/dodo-webhook` → select **payment.succeeded**, **payment.failed**, **refund.succeeded** → save → copy the endpoint's **signing secret** (`whsec_…`) from its Overview tab.
   > ⚠️ The URL must end in exactly `/api/dodo-webhook`. A webhook pointed at the bare
   > site accepts the delivery but never fulfills it — checkout succeeds while
   > `/api/verify-payment` keeps returning `verified:false` and premium never activates.
5. Map each plan to its product id in `DODO_PRODUCT_IDS` (see below).

### 4. Configure `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

DODO_PAYMENTS_API_KEY=dodo_test_xxx
DODO_PAYMENTS_WEBHOOK_KEY=whsec_xxx
DODO_PAYMENTS_ENVIRONMENT=test_mode
DODO_PRODUCT_IDS=Weekly=pdt_xxx,Monthly=pdt_xxx,Lifetime=pdt_xxx

CRON_SECRET=long-random-string-here
```

### 5. Run Locally

```bash
npm run dev      # http://localhost:3000
```

### 6. Deploy to Vercel

1. Push to your private GitHub repo.
2. Vercel → **Add New Project** → Import repo.
3. **Environment Variables** → add all from `.env.local`.
4. Deploy. Your public site is live at `https://<project>.vercel.app`.

## Project Structure

```
jobkar/
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API routes
│   │   ├── jobs/[id]/            # Public job detail (contact_info gated)
│   │   ├── settings/             # Public pricing config
│   │   ├── create-checkout/      # Dodo hosted checkout session (server-priced pin)
│   │   ├── verify-payment/       # Client confirmation polling
│   │   ├── dodo-webhook/         # Standard-Webhooks signature → process_payment RPC
│   │   ├── withdrawals/          # Balance-checked withdrawals (session client)
│   │   └── cron/release-commissions/  # Vercel cron (CRON_SECRET)
│   ├── jobs/                     # Public feed + detail pages
│   ├── dashboard/                # Jobseeker referral dashboard
│   ├── login/                    # Supabase email/password
│   ├── signup/                   # Supabase signup + full_name
│   ├── pricing/                  # Dodo hosted checkout + verify-payment polling
│   ├── profile/                  # User profile
│   ├── page.tsx                  # Landing (live jobs + stats)
│   ├── sitemap.ts / robots.ts    # SEO
│   └── layout.tsx
├── components/
│   ├── JobCard.tsx               # Public job card
│   ├── BlurredJobCard.tsx        # Premium paywall card
│   ├── PaywallModal.tsx          # Premium upsell
│   ├── Navbar.tsx / Footer.tsx   # Site chrome
│   ├── WithdrawalModal.tsx       # Withdrawal submission
│   ├── BankConnectModal.tsx      # Bank connect (update_own_profile RPC)
│   └── ui/Button.tsx
├── contexts/AuthContext.tsx      # Supabase auth + profile sync (operator role type)
├── lib/
│   ├── database.types.ts         # Hand-written typed schema (v10)
│   ├── supabase.ts               # Browser client
│   ├── server.ts                 # Route-handler + service-role clients
│   ├── dodo.ts                   # Dodo REST helper + webhook signature verify
│   ├── settings.ts               # site_settings fetch + defaults
│   ├── plans.ts                  # Prices/durations/tiers
│   ├── money.ts                  # Commission/expiry/balance math
│   ├── validation.ts             # Zod schemas
│   ├── safe-url.ts               # http(s) link allowlist
│   ├── rate-limit.ts             # In-memory sliding window
│   └── toast.tsx                 # Toast context
├── middleware.ts                 # Session refresh + /dashboard,/profile gates
├── supabase/
│   ├── schema.sql                # v10 schema (tables, RLS, views, RPCs)
│   ├── dashboard-patch.sql       # Pre-split → v10 migration (once)
│   └── seed.sql                  # 12 demo jobs + settings
├── test/                         # vitest suites (money math, reconcile, validation, …)
├── vitest.config.ts
├── vercel.json                   # Daily crons (release_commissions + reconcile-payments)
└── .github/workflows/ci.yml
```

## Key Flows

### Job listings (write path = desktop app only)

1. Operator runs the desktop app → AI Agent tab → pastes a job URL → the app's scraper engine (hardened fetch → cheerio + JSON-LD → `apply_url` heuristics → Gemini fallback) extracts the listing.
2. The extracted field set goes to the Review Queue as `pending_review`.
3. Operator toggles Premium/Featured → **Approve** → `approve_job` RPC stamps `approved_at` + `expires_at`.
4. The `job_listings` trigger bumps `jobs_version`; the website **refetches immediately** via Realtime and the job appears on `/jobs`.

`apply_url` is a top-level column (where a job is actually applied — often an ATS link) discovered by the scraper; `source_link` is the original listing page.

### Premium Purchase

1. Jobseeker clicks a blurred premium card → **View Premium Plans** → `/pricing`.
2. Selects plan → optional referral code → **Pay Now**.
3. Frontend calls `/api/create-checkout` → Dodo hosted checkout session with `metadata` attribution (userId, plan, referralCode) + an order-time price pin from server-side `site_settings` (never from client).
4. Customer pays on Dodo's hosted page → redirected back to `/pricing?payment_id=…` → `/api/verify-payment` polls → premium unlocks.
5. Webhook (`/api/dodo-webhook`) → Standard-Webhooks signature verify → amount vs price pin → `process_payment` RPC (idempotent) → premium expiry = `max(current, now) + duration` → tiered referral commission (20%/25%) set to `pending`.

### Referral Commission

- 20% (Weekly/Monthly) or 25% (Lifetime) of plan price.
- **15-minute holding period**, then available → withdrawn via `/api/withdrawals` → operator approves in the desktop app (`approve_withdrawal` RPC, atomic + partial consumption). Self-referral blocked.

## Running Tests

```bash
npx tsc --noEmit      # TypeScript strict
npm run lint          # ESLint
npm run build         # Next.js build
npx vitest run        # reconcile + validation + money + jobs suites
```

CI runs all four on every push to `main`.

## Security Notes

- **RLS** on all tables; public reads only via `public_jobs` view (safe columns). `contact_info`/`admin_notes` never appear publicly. Operators read all rows via `is_operator()`-gated policies + `operator_profiles` view (which excludes `bank_*`).
- **Webhook**: Standard-Webhooks HMAC (`webhook-id.webhook-timestamp.body`, base64 secret) with `timingSafeEqual`; amount verified against the checkout-time price pin; idempotent on unique `payment_id`; full refunds void commissions (partial refunds change nothing).
- **Withdrawal integrity**: `request_withdrawal` RPC locks commission rows and validates threshold/bank/balance in one transaction; `approve_withdrawal` / `reverse_withdrawal` lock rows and re-check the ledger mid-loop (no double-spend; 15-min reverse window).
- **Money math**: prices always server-side; Dodo metadata values are strings.
- **No service-role key** in the repo or on operator machines; cron guarded by `CRON_SECRET`. The Dodo API key and webhook secret are server-only env vars — Dodo checkout is fully hosted, so no payment credentials ever reach the browser.
- **XSS**: `source_link`/`apply_url` rendered only through `safeExternalUrl()` (http/https allowlist); DB check constraint rejects non-http(s) links; scraped descriptions render as escaped text.
- **CSV export** (desktop app) neutralizes formula-injection cells.

## Operator Accounts

Operators manage listings via the **desktop app** (`jobkar-dashboard`). This repo has no admin/agent dashboard pages and no `ENABLE_DASHBOARDS` flag.

```sql
-- 1. Supabase → Authentication → Users → Add user (owner@…, password).
-- 2. SQL Editor:
update public.profiles set role = 'operator' where email = 'owner@…';
```

Operators browsing the website are treated as ordinary jobseekers (no elevated UI). See `jobkar-dashboard/README.md` for the desktop runbooks.

## License

Private — not for distribution.
