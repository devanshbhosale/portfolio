# Jobkar — Production Job Portal

A blue-collar job portal with premium listings, referral rewards, agent submission, and admin moderation. Built with Next.js 14.2, Supabase (Postgres + Auth + RLS), and Razorpay payments. Runs on free tiers (Supabase Free, Vercel Hobby, GitHub private).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Private Repo                      │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
      ┌──────────────────┐             ┌──────────────────┐
      │   Your Machine   │             │  Friend's Machine│
      │  (ENABLE_DASH-   │             │  (ENABLE_DASH-   │
      │   BOARDS=true)   │             │   BOARDS=true)   │
      │  npm run dev     │             │  npm run dev     │
      └────────┬─────────┘             └────────┬─────────┘
               │                                │
               └───────────────┬────────────────┘
                               ▼
                    ┌────────────────────────┐
                    │     Supabase Cloud     │
                    │  Postgres + Auth + RLS │
                    │  Realtime + Storage    │
                    └───────────┬────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
           ┌─────────────────┐      ┌─────────────────┐
           │   Vercel (Prod) │      │   Razorpay      │
           │  Public Website │      │  Payments       │
           │  ENABLE_DASH-   │      │  Webhook →      │
           │  BOARDS=false   │      │  process_payment│
           └─────────────────┘      └─────────────────┘
```

- **Single codebase, two modes** via `ENABLE_DASHBOARDS` env flag (read in `middleware.ts`).
- **Public site (Vercel)**: `ENABLE_DASHBOARDS=false`. Middleware returns 404 for `/dashboard/agent`, `/dashboard/admin`, `/api/admin/*`. Zero admin surface on the public domain.
- **Local dashboards**: Run `npm run dashboard` on your machine + friend's machine with `ENABLE_DASHBOARDS=true`. Both are **admin-role** accounts created in Supabase Auth dashboard.
- **Live sync**: Supabase Realtime on `job_listings`, `premium_purchases`, `site_settings`. Save in dashboard → website updates immediately.
- **Secrets**: `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `CRON_SECRET` live only in Vercel project settings. Local machines use anon key + role-based login + RLS + RPCs.

## Cost

| Item | Cost | Notes |
|------|------|-------|
| Supabase Free | ₹0/mo | 500 MB DB, 50k MAU, ~2 verification emails/hour |
| Vercel Hobby | ₹0/mo | 100 GB bandwidth/mo, daily cron |
| GitHub Private | ₹0/mo | Code stays closed |
| Razorpay | Pay-as-you-go | ~2% per successful payment (lower for UPI) |
| Domain (optional) | ₹500–1,000/yr | e.g. `jobkar.in` |
| **When outgrown** | **Supabase Pro $25/mo** · **Vercel Pro $20/mo** | |

## Quick Start

### 1. Clone & Install

```bash
git clone <your-private-repo-url> jobkar
cd jobkar
npm install
cp .env.example .env.local   # fill in real keys (see below)
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com) → note `URL` and `anon key`, `service_role key`.
2. **SQL Editor** → Run `supabase/schema.sql` (tables, RLS, views, RPCs, trigger).
3. **SQL Editor** → Run `supabase/seed.sql` (12 demo jobs + settings row).
4. **Authentication → Providers** → Enable **Email** (turn off "Confirm email" for local testing; keep ON for production).
5. Create your admin account(s):
   - **Auth → Users → Add user** → email + password (e.g. `you@jobkar.in`).
   - The `handle_new_user` trigger auto-creates their profile.
   - **SQL Editor** → `update public.profiles set role = 'admin' where email = 'you@jobkar.in';`
   - Repeat for your friend (also admin).

### 3. Razorpay Setup

1. Create account at [dashboard.razorpay.com](https://dashboard.razorpay.com) → **Settings → API Keys** → generate **Test** keys.
2. **Webhooks** → Add webhook: `https://<your-vercel-domain>/api/razorpay-webhook` → select **payment.captured**, **refund.processed**, **payment.failed** → save.
3. Copy `Key ID` and `Key Secret`.

### 4. Configure `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxx

CRON_SECRET=long-random-string-here

# Your machine + friend's machine:
ENABLE_DASHBOARDS=true
```

### 5. Run Locally

```bash
npm run dashboard   # starts on http://localhost:3000 with dashboards enabled
```

- Open `/login` → sign in with your admin email → you'll see **Admin Panel** and **Agent Dashboard** links in the navbar.
- Friend does the same on their machine (clone repo, same `.env.local`, `npm run dashboard`).

### 6. Deploy to Vercel

1. Push to your private GitHub repo.
2. Vercel → **Add New Project** → Import repo.
3. **Environment Variables** → add all from `.env.local` **except** `ENABLE_DASHBOARDS=true` (set `ENABLE_DASHBOARDS=false` or omit — defaults to false).
4. Deploy. Your public site is live at `https://<project>.vercel.app`.

### 7. Verify Production

- `ENABLE_DASHBOARDS=false` on Vercel → `/dashboard/agent`, `/dashboard/admin`, `/api/admin/*` return 404.
- Jobseeker referral dashboard `/dashboard` still works.
- Razorpay webhook URL must be the **production** domain.

## Project Structure

```
jobkar/
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API routes (public + local-only)
│   │   ├── jobs/[id]/            # Public job detail (contact_info gated)
│   │   ├── settings/             # Public pricing config
│   │   ├── create-order/         # Razorpay order (server-priced)
│   │   ├── verify-payment/       # Client confirmation polling
│   │   ├── razorpay-webhook/     # HMAC → process_payment RPC
│   │   ├── withdrawals/          # Balance-checked withdrawals
│   │   ├── cron/release-commissions/  # Vercel cron (CRON_SECRET)
│   │   └── agent/                # Local-only: parse-link, submit-job, renew-job
│   ├── jobs/                     # Public feed + detail pages
│   ├── dashboard/                # Jobseeker referral dashboard
│   ├── dashboard/agent/          # Agent submit/parse/renew (local mode)
│   ├── dashboard/admin/          # Admin tabs (local mode)
│   ├── login/                    # Supabase email/password
│   ├── signup/                   # Supabase signup + full_name
│   ├── pricing/                  # Razorpay checkout + verify-payment polling
│   ├── profile/                  # User profile
│   ├── page.tsx                  # Landing (live jobs + stats)
│   ├── sitemap.ts                # SEO (static + dynamic job URLs)
│   └── robots.ts                 # SEO
├── components/
│   ├── admin/                    # Admin tab components
│   ├── JobCard.tsx               # Public job card
│   ├── BlurredJobCard.tsx        # Premium paywall card
│   ├── JobForm.tsx               # Shared job editor
│   ├── Navbar.tsx                # Role-aware navigation
│   ├── WithdrawalModal.tsx       # Real withdrawal submission
│   ├── BankConnectModal.tsx      # Real bank connect (update_own_profile RPC)
│   ├── PricingCard.tsx           # Plan selector
│   └── ui/Button.tsx             # Primary button
├── contexts/
│   └── AuthContext.tsx           # Real Supabase auth + profile sync
├── lib/
│   ├── database.types.ts         # Hand-written typed schema
│   ├── supabase.ts               # Browser client
│   ├── server.ts                 # Route-handler cookie client + admin client
│   ├── settings.ts               # site_settings fetch + defaults
│   ├── plans.ts                  # Plan prices/durations/tiers
│   ├── money.ts                  # Commission/expiry/balance math
│   ├── validation.ts             # Zod schemas
│   ├── rate-limit.ts             # In-memory sliding window
│   └── toast.tsx                 # Toast context
├── middleware.ts                 # Session refresh + role gates + ENABLE_DASHBOARDS flag
├── supabase/
│   ├── schema.sql                # Tables, RLS, views, RPCs, trigger
│   └── seed.sql                  # 12 demo jobs + settings + admin instructions
├── test/
│   └── money.test.ts             # Vitest unit tests (commission, expiry, balance)
├── vitest.config.ts
├── vercel.json                   # Daily cron for release_commissions
└── .github/workflows/ci.yml      # tsc + lint + vitest + build on every push
```

## Key Flows

### Agent Submits a Job
1. Agent opens `/dashboard/agent` → pastes a job link → clicks **Fetch Details**.
2. Backend (`/api/agent/parse-link`) fetches with SSRF guards → extracts via JSON-LD `JobPosting` then cheerio → returns editable fields (422 if parse fails → manual entry).
3. Agent reviews/edits → clicks **Submit for Review** → `pending_review` in DB.
4. Admin opens `/dashboard/admin` → **Pending Jobs** tab → sees it live via Realtime.
5. Admin toggles **Premium** / **Featured** → clicks **Approve** → job appears on public `/jobs` immediately.

### Premium Purchase
1. Jobseeker clicks a blurred premium card → **View Premium Plans** → `/pricing`.
2. Selects plan → enters optional referral code → **Pay Now**.
3. Frontend calls `/api/create-order` → **price comes from server-side `site_settings`** (never from client).
4. Razorpay Checkout opens → user pays → handler → `/api/verify-payment` polls → `refreshProfile()` → premium unlocks.
5. Razorpay webhook (`/api/razorpay-webhook`) → HMAC verify → amount vs settings → `process_payment` RPC (idempotent on `payment_id`) → premium expiry = `max(current, now) + duration` → tiered referral commission (20%/25%) set to `pending`.

### Referral Commission
- 20% (Weekly/Monthly) or 25% (Quarterly/Annual) of plan price.
- **15-minute holding period** (lazy in every balance query + formalized by daily cron).
- Available → withdrawn via `/api/withdrawals` (server-side balance math) → admin approves via `approve_withdrawal` RPC (atomic: withdrawal + consumes oldest available commissions with partial consumption).
- Self-referral blocked.

### Settings (Admin Only)
- `/dashboard/admin` → **Settings** tab → edit prices, commission tiers, withdrawal threshold, job TTL, featured duration → saved via `update_site_settings` RPC → public pricing + payments + job expiry update immediately (no redeploy).

## Admin Account Creation

```sql
-- 1. Supabase Dashboard → Authentication → Users → "Add user"
--    email: you@jobkar.in  /  password: <strong>
-- 2. SQL Editor:
update public.profiles set role = 'admin' where email = 'you@jobkar.in';
-- 3. Login at /login with that email/password.
```

Friend = same steps, also admin.

## Running Tests

```bash
npx tsc --noEmit      # TypeScript strict
npm run lint          # ESLint
npm run build         # Next.js build (public mode)
npm test              # vitest (money math)
```

CI runs all four on every push to `main` (`.github/workflows/ci.yml`).

## Browser E2E (Manual Smoke)

With `npm run dashboard` running:
1. Open `http://localhost:3000` → landing loads with live stats.
2. `/jobs` → free cards clickable, premium cards blurred + paywall.
3. `/pricing` → select plan → Razorpay Checkout opens (test mode).
4. `/login` → signup → `/dashboard` shows referral code + earnings cards.
5. `/dashboard/agent` → parse link → submit → `/dashboard/admin` → approve → job appears on `/jobs`.
6. `/dashboard/admin` → **Settings** → change price → `/pricing` reflects instantly.

## Security Notes

- **RLS** on all tables; public reads only via `public_jobs` view (safe columns).
- **SSRF hardening** on parse-link: scheme allowlist, post-DNS private-IP block (including `::ffff:`), redirect cap, 10s timeout, 2MB stream cap, HTML-only.
- **Webhook**: raw-body HMAC with `timingSafeEqual`; amount verified against `site_settings`; idempotent on unique `payment_id`.
- **Money math**: prices always server-side; commission tiers server-side; withdrawal balance checked server-side (available − pending ≥ amount, ≥ threshold).
- **No service-role key** on friend's machine or in the repo.

## License

Private — not for distribution.