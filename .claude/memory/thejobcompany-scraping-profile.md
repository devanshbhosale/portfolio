---
name: thejobcompany-scraping-profile
description: Verified scraping flow for thejobcompany job listings — site moved to
  thejobcompany.co.in, cards link job_details.php (normalized to apply_page.php),
  a#applyButton stale heuristic
metadata:
  node_type: memory
  type: project
  originSessionId: sess_6c20739e-3d54-4f65-bbfe-ccf1be42136e
---

Thejobcompany is the FIRST per-site scraping profile in the desktop app's site-profile registry. User clarified the scraper is GENERIC for any website; thejobcompany is just one tuned entry, not the architecture.

**DOMAIN CHANGE (verified live 2026-08-21):** `thejobcompany.com` now redirects to hugedomains.com (domain for sale) — NOT the real site. `thejobcompany.in` 301s → **`thejobcompany.co.in`** (title "The Job Company | Find Your Ideal Tech Job"). Any URL hardcoding the old domain must use `.co.in`.

Verified current structure:
- Listing pages live at `/job-category/batch/2025`, `/job-category/internships`, `/job-category/software-Engineer`, `/job-category/web-development` etc. (~15 cards each).
- **Site drift: cards now link `job_details.php?job_id=N`, no longer `apply_page.php` directly.** The profile's enumerate matches via `a[href*="job_id="]` so enumeration still worked, but the URL-normalize step preserved the pathname — the queue would have fetched job_details (which lacks the button) and marked EVERY job falsely stale. Fix (commit `593039e`): `applyPage.pathname = applyPage.pathname.replace(/job_details\.php$/, 'apply_page.php')`. Regression test in `test/thejobcompany.test.ts` (19/19 green).
- **apply_page flow still valid:** `apply_page.php?job_id=6208` → `a#applyButton` → employer ATS URL (verified: `hdjq.fa.us2.oraclecloud.com/.../job/26000650`, Oracle Cloud HCM). Raw HTML, no JS needed.
- Stale heuristic unchanged: missing `a#applyButton` ⇒ posting pulled ⇒ mark stale.
- Fuzzy selectors (`[class*=…]`) in the profile are the designated tuning point when the site drifts again — check here first when scrape results look off.

**Test URL for E2E:** `https://thejobcompany.co.in/job-category/batch/2025`

See [[project-jobkar-rebuild]] and [[job-scraper-pipeline-design]].
