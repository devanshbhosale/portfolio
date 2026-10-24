# Ads Migration Plan — remove payments, go AdSense

Date stamped: 2026-10-24. Approved plan (v2, review-loop hardened). Status:
**EXECUTED + LIVE-VERIFIED 2026-10-24, commit `a517124`** — smoke 26/26 green,
tsc/lint/vitest(64)/build green, DODO_*/CRON_SECRET removed from Vercel.
Go-live checklist when AdSense approves: set NEXT_PUBLIC_ADSENSE_CLIENT in
Vercel → redeploy, fill real slot ids in lib/ads.ts, uncomment ads.txt line.

Pre-flight verified (Supabase MCP, 2026-10-24): 0 active premium users, 1 historical
purchase (the Sep-19 Rs 149 Weekly, expired), 0 unsettled commissions, 0 withdrawal
requests ever. Removal carries zero money liability.

## Decisions locked with user
- Google AdSense; slots ship with dev placeholders, dark in prod until
  `NEXT_PUBLIC_ADSENSE_CLIENT` is set (flip after account approval).
- High-but-policy-safe density: sticky 160px left rail + 300px right rail on /jobs
  (xl+ only), in-feed unit per 6 job cards, 300px rail on job detail, 2 homepage units.
  Literal 75% ad coverage rejected: violates AdSense policy.
- "Premium Listings" relabels to "Featured Listings" — display strings only. The wire
  contract stays `tier=premium` (URL + `/api/jobs` + `search_jobs.p_premium`), and
  `is_featured` remains a separate sort-boost column, untouched.

## Wave 1 — removal
Delete: 6 payment API routes; lib/dodo, reconcilePayments, jobRedaction, money,
settings, plans; /api/settings route; app/pricing + PricingPlans/PricingCard/
PaywallModal/BlurredJobCard; app/dashboard; Bank/Upi/Withdrawal modals; vercel.json
(crons were payments-only); tests reconcile/money/jobRedaction/settings; artifacts.
Edit: /api/jobs serves full rows; isPremiumActive out of lib/server; validation keeps
reportSchema only; AuthContext drops referral/premium/bank/upi fields (lockstep with
test/authUserMapping.test.ts); database.types strips payment objects; /jobs + /jobs/[id]
unlock fully (JSON-LD on every job — all become Google Jobs eligible); homepage single
grid + real stat; Navbar/Footer/robots/sitemap/proxy/redirect updates (/pricing 301s to
/jobs via next.config redirects); globals.css drops .blur-premium/.card-glass;
legal copy de-paymented; ci.yml drops Razorpay/CRON placeholders; smoke.mjs paywall
checks inverted (premium rows MUST carry apply_url/description/source_link).

DB deliberately untouched (shared with the local dashboard repo). Dormant jobseeker
RPCs (update_own_profile, set_own_upi, request_withdrawal) stay REST-callable — same
posture as today; money RPCs are service-role-only so no new commission can be created.
Revoking them is deferred to a dashboard-repo cleanup.

## Wave 2 — ads
New: lib/ads.ts (+test), components/ads/{AdSlot,AdSenseScript,AdRail}.tsx,
components/ConsentBanner.tsx, public/ads.txt (commented placeholder). CSP adds
googlesyndication/doubleclick/google/googletagmanager to script-src and frame-src.
Consent Mode v2 defaults load before the AdSense tag. Privacy policy rewritten: ad
cookies disclosed, banner documented, bank/UPI/payment disclosures dropped.

## Wave 3 — ship
vitest/tsc/lint/build; code-review-preshipment (SHIP verdict required); deploy;
live smoke (/pricing 301, unlocked /api/jobs, ads.txt 200, CSP headers, JSON-LD on a
previously locked job); prod logs check; Vercel env cleanup (DODO_*, CRON_SECRET)
after live verification; memory docs updated.

## Deferred (with triggers)
- Real slot IDs + ads.txt line + env flip — when AdSense approves.
- Custom domain purchase before applying (vercel.app subdomains are frequently
  rejected; user decision, ~Rs 500-800/yr) — gates the application, not this build.
- Denser ads (mobile anchor, in-feed every 4) — if RPM disappoints.
- DB drops + RPC revokes — with dashboard-repo cleanup.
- Dodo account closure + webhook URL removal in their dashboard — user, anytime.
- Nonce CSP — pre-existing security-posture item.

## User-side steps after ship
1. Resubmit sitemap in Search Console (all job URLs become Google Jobs eligible).
2. Optionally remove the Dodo webhook URL in the Dodo dashboard.
3. Buy a custom domain, point it at Vercel (then GSC re-verify), apply to AdSense.
