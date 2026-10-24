# Jobkar — Job Portal (Website)

A blue-collar job portal, free to browse and apply, supported by ads. Two repos make up the system:

| Repo | What it is | Tech |
|------|-----------|------|
| **`jobkar`** (this repo) | Public website (jobs + accounts) | Next.js, Supabase (Postgres + Auth + RLS), Google AdSense |
| **`jobkar-dashboard`** | Desktop operator control panel (Windows `.exe`) | Electron + React + Tailwind |

The website is the only public surface. All listing management (scrape → review → approve) happens in the **desktop app**, never on the public domain.

> Payments, premium subscriptions, referral rewards and payouts were removed
> from the website on 2026-10-24 (see `docs/ADS-MIGRATION-PLAN.md`). The DB
> tables remain for the desktop repo; the website simply never touches them.

## Architecture

```
┌──────────────────────┐        ┌──────────────────────────────┐
│   Supabase Cloud     │        │  Google AdSense (ads)        │
│  Postgres + Auth     │        │  script + slots, env-gated   │
│  Realtime + RLS      │        └──────────────────────────────┘
└──────────┬───────────┘
           │
     ┌─────┴─────────────────────────────┐
     ▼                                   ▼
┌──────────────────────┐        ┌──────────────────────────┐
│  Vercel (Public)     │        │  Desktop app (operators) │
│  This website        │        │  jobkar-dashboard.exe    │
│  - jobs feed/detail  │        │  - scrape + AI fallback  │
│  - accounts + saves  │        │  - review + approve      │
│  - ads (AdSense)     │        │  - settings + analytics  │
│  - NO admin surface  │        │                          │
└──────────────────────┘        └──────────────────────────┘
```

- **One DB, two clients.** Both repos share Supabase. The website is read-mostly; the desktop app is the write path.
- **Operator accounts.** Listing management is done by accounts with `role = 'operator'`. Operators sign in to the desktop app, not the website.
- **Live sync.** The website refetches on window focus and a visible-tab interval; the `jobs_version` trigger table stays as a change sentinel.
- **Secrets.** Website secrets (`SUPABASE_SERVICE_ROLE_KEY`) live only in Vercel project settings. AdSense is configured by the public `NEXT_PUBLIC_ADSENSE_CLIENT` publisher id. The desktop app holds only `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `GEMINI_API_KEY`, and uses RLS + operator-gated RPCs.

## Cost

| Item | Cost | Notes |
|------|------|-------|
| Supabase Free | ₹0/mo | 500 MB DB, 50k MAU, ~2 verification emails/hour |
| Vercel Hobby | ₹0/mo | 100 GB bandwidth/mo |
| GitHub Private | ₹0/mo | Both repos stay closed |
| Gemini API | Pay-as-you-go | Only for scrape-fallback parsing (desktop app) |
| Domain (recommended) | ₹500–1,000/yr | AdSense approval on a vercel.app subdomain is unreliable — buy a domain before applying |
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
2. **SQL Editor** → Run `supabase/schema.sql` (tables, RLS, views, RPCs, triggers).
3. **SQL Editor** → Run `supabase/seed.sql` (12 demo jobs + settings row).
4. **Authentication → Providers** → Enable **Email** (turn off "Confirm email" for local testing; keep ON for production).
5. Create operator account(s):
   - **Auth → Users → Add user** → email + password (e.g. `owner@…`).
   - **SQL Editor** → `update public.profiles set role = 'operator' where email = 'owner@…';`
   - These credentials go into the **desktop app**, not the website.

> Upgrading an existing pre-split database? Run `supabase/dashboard-patch.sql` once instead of `schema.sql`.

### 3. Configure `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional until the AdSense account is approved; unset = no ads served.
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
```

### 4. Run Locally

```bash
npm run dev      # http://localhost:3000
```

### 5. Deploy to Vercel

1. Push to your private GitHub repo.
2. Vercel → **Add New Project** → Import repo.
3. **Environment Variables** → add all from `.env.local`.
4. Deploy. Your public site is live at `https://<project>.vercel.app`.

## Project Structure

```
jobkar/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── jobs/                 # The only public job-list exit (search_jobs RPC)
│   │   └── reports/              # Report-this-listing (authed)
│   ├── jobs/                     # Public feed + detail pages
│   ├── login/ · signup/          # Supabase email/password
│   ├── profile/                  # User profile
│   ├── page.tsx                  # Landing (live jobs + stats)
│   ├── sitemap.ts / robots.ts    # SEO
│   └── layout.tsx                # AdSense script + consent banner
├── components/
│   ├── JobCard.tsx               # Public job card
│   ├── ads/                      # AdSlot, AdSenseScript, AdRail
│   ├── ConsentBanner.tsx         # Cookie consent (Consent Mode v2)
│   ├── Navbar.tsx / Footer.tsx   # Site chrome
│   └── ui/Button.tsx
├── contexts/AuthContext.tsx      # Supabase auth + profile sync
├── lib/
│   ├── ads.ts                    # AdSense client id + slot map
│   ├── database.types.ts         # Website-consumed typed schema subset
│   ├── supabase.ts               # Browser client
│   ├── server.ts                 # Route-handler + service-role clients
│   ├── validation.ts             # Zod schemas
│   ├── safe-url.ts               # http(s) link allowlist
│   ├── rate-limit.ts             # In-memory sliding window
│   └── toast.tsx                 # Toast context
├── proxy.ts                      # Session refresh + /profile gate
├── supabase/
│   ├── schema.sql                # Full schema (tables, RLS, views, RPCs)
│   ├── dashboard-patch.sql       # Pre-split migration (once)
│   └── seed.sql                  # 12 demo jobs + settings
├── test/                         # vitest suites
├── vitest.config.ts
├── public/ads.txt                # AdSense authorized sellers
└── .github/workflows/ci.yml
```

## Key Flows

### Job listings (write path = desktop app only)

1. Operator runs the desktop app → AI Agent tab → pastes a job URL → the app's scraper engine (hardened fetch → cheerio + JSON-LD → `apply_url` heuristics → Gemini fallback) extracts the listing.
2. The extracted field set goes to the Review Queue as `pending_review`.
3. Operator toggles Featured → **Approve** → `approve_job` RPC stamps `approved_at` + `expires_at`.
4. The `job_listings` trigger bumps `jobs_version`; the job appears on `/jobs`.

`apply_url` is a top-level column (where a job is actually applied — often an ATS link) discovered by the scraper; `source_link` is the original listing page. Every approved job serves its full fields to every visitor, and every job detail page emits `JobPosting` JSON-LD (Google Jobs eligible).

### Ads

- Slots live in `components/ads/`; the loader + consent banner mount in `app/layout.tsx`.
- With `NEXT_PUBLIC_ADSENSE_CLIENT` unset, slots render nothing and no third-party script loads.
- Slot ids come from `lib/ads.ts`; create the matching ad units in the AdSense dashboard and paste their ids there, then replace the placeholder line in `public/ads.txt`.

## Running Tests

```bash
npx tsc --noEmit      # TypeScript strict
npm run lint          # ESLint
npm run build         # Next.js build
npx vitest run        # unit suites
node scripts/smoke.mjs  # post-deploy live checks (run after every deploy)
```

CI runs the first four on every push to `main`.

## Security Notes

- **RLS** on all tables; public reads only via `public_jobs` view through the service-role `search_jobs` RPC (anon REST on the view is revoked). `contact_info`/`admin_notes` never appear in list responses. Operators read all rows via `is_operator()`-gated policies.
- **XSS**: `source_link`/`apply_url` rendered only through `safeExternalUrl()` (http/https allowlist); DB check constraint rejects non-http(s) links; scraped descriptions render as escaped text; JSON-LD escapes `<`.
- **Ads CSP**: AdSense script/frame origins are allowlisted in `next.config.js`; the pre-existing `unsafe-inline`/`unsafe-eval` trade stays until the nonce-CSP fix lands.
- **No service-role key** in the repo or on operator machines.
- Historical payment tables (`premium_purchases`, `withdrawal_requests`) remain in the DB but nothing on the website reads or writes them; the money RPCs are service-role-only.

## Operator Accounts

Operators manage listings via the **desktop app** (`jobkar-dashboard`). This repo has no admin/agent dashboard pages.

```sql
-- 1. Supabase → Authentication → Users → Add user (owner@…, password).
-- 2. SQL Editor:
update public.profiles set role = 'operator' where email = 'owner@…';
```

Operators browsing the website are treated as ordinary jobseekers (no elevated UI). See `jobkar-dashboard/README.md` for the desktop runbooks.

## License

Private — not for distribution.
