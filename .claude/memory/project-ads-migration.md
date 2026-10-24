---
name: project-ads-migration
description: Payments removed site-wide 2026-10-24, AdSense slots shipped dark;
  flip NEXT_PUBLIC_ADSENSE_CLIENT when approved
metadata:
  node_type: memory
  type: project
  originSessionId: session_f7557accd6ab7307d753685e91a17a0f
---

**Payments → ads migration EXECUTED + LIVE-VERIFIED 2026-10-24 (commit `a517124`)**, plan doc `docs/ADS-MIGRATION-PLAN.md` in repo.

- DB deliberately untouched (dashboard repo dependency): premium_purchases/withdrawal_requests/site_settings tables + jobseeker RPCs (update_own_profile/set_own_upi/request_withdrawal) still exist and stay REST-callable (pre-existing posture); money RPCs verified service-role-only. DB drops deferred to a dashboard-repo cleanup.
- Pre-flight verified 0 active premium users / 0 unsettled commissions / 0 withdrawals ever (single Sep-19 Rs 149 purchase, expired).
- All 27 payment files deleted; /api/jobs serves complete rows to everyone; /jobs/[id] always emits JobPosting JSON-LD (all jobs Google-Jobs eligible — resubmit sitemap in GSC, still pending user action).
- "Featured" relabel is DISPLAY-ONLY: wire stays `tier=premium` (URL + search_jobs p_premium + jobsFilters); `is_featured` is a separate sort-boost column — never conflate them.
- AdSense: slots + consent banner + CSP shipped DARK; go-live = set `NEXT_PUBLIC_ADSENSE_CLIENT` (build-time inlined on Vercel → set env THEN redeploy), fill real slot ids in `lib/ads.ts` (currently '0'), uncomment the line in `public/ads.txt`. **Approval on vercel.app subdomain likely rejected — user should buy a custom domain first (Rs 500-800/yr); flagged, undecided.**
- Consent Mode v2: defaults-denied snippet is beforeInteractive in layout, gated on adsEnabled(); banner uses useSyncExternalStore on localStorage (`jobkar:consent`) — the repo's react-hooks v7 lint rejects setState-in-effect.
- Vercel: DODO_*/CRON_SECRET env vars REMOVED from all environments (rollback needs re-adding); vercel.json deleted (crons were payments-only); repo now linked to Vercel project `portfolio` (.vercel/, gitignored).
- Dodo webhook URL still configured in their dashboard → deliveries now 404 (harmless; user can remove anytime; account closure optional).
- Agent spawning was platform-blocked all session (7 attempts, all types) — checkpoints + preshipment were rigorous self-reviews; smoke 26/26 green live covered the deploy gate.

Supersedes the live claims in [[project-dodo-payments-switch]], [[project-upi-payout-rail]], [[project-lifetime-plan-pricing]], [[project-premium-cards-page-bg]] (all now historical).
