---
name: project-brand-rename-jobkarbe
description: Site-wide rename Jobkar → Jobkarbe (1669ead, LIVE) incl. support email swap to support@jobkarbe.in; localStorage keys intentionally left as jobkar:
metadata:
  type: project
---

2026-09-19: Renamed the brand Jobkar → **Jobkarbe** everywhere user-visible in the website repo (devanshbhosale/portfolio) and pushed as `1669ead`; Vercel auto-deployed and verified live (titles `X | Jobkarbe`, navbar Job**karbe**, footer, OG image, JSON-LD identifier, checkout fallback name). Per-page title suffixes were removed so the root template `%s | Jobkarbe` applies once (first pass produced doubled titles — caught in prerendered HTML).

**Support email is now `jobkarbe@gmail.com`** (17 refs across contact/faq/grievance/privacy/terms/Footer/PricingPlans/ReportListingButton; commit `f788c41`). History: I first picked `support@jobkarbe.in` on my own — user asked why; rationale was brand-matched custom domain, but that implied a Workspace purchase the user never asked for, so switched to the free Gmail he actually wants. **User must create the jobkarbe@gmail.com inbox (and consider a Gmail alias list) — mailto links dead-end until it exists.** Site URL env still serves jobkarbe.vercel.app until a domain is attached.

Deliberately NOT renamed (visible-safe): localStorage keys `jobkar:saved`/`jobkar:applied`/`jobkar:recent-searches` (rename would wipe users' saved jobs), DB GUC `jobkar.bypass`, docs/package.json. All em/en dashes removed from visible copy (AI-tell), comments untouched.

Related: [[project-jobkar-rebuild]], [[jobkar-legal-compliance-audit]]

2026-09-26: brand **logo system shipped** — commit `63fa91d`, pushed to origin main (devanshbhosale/portfolio) so Vercel deploys it. Contents: `components/Logo.tsx` (full/mark/wordmark variants, dark/light themes, built on the locked palette — K-strut `#1D4ED8`, light J-pillar `#0F2A4A`; latent quirk left alone: same-theme SVG gradient IDs repeat across the two per-page renders, definitions identical so rendering is correct), `app/icon.svg` (favicon via Next convention, no config), `public/logo.svg`/`logo-light.svg`/`logo-mark.svg`/`favicon.svg` + `public/brand-showcase.html` (self-contained brand-kit page that displays and offers downloads of each asset; `.zcodeignore` deliberately left untracked as agent tooling). Pre-commit fixes: em-dash in the showcase subtitle rewritten to a colon (standing no-AI-tells rule) and an unused lucide `Zap` import dropped from Navbar. 114 tests + tsc + lint green at commit time. **Workflow note: the user expects commits to land on GitHub, not stay local — he followed the commit with "u commited it to my github right?"; when committing to this repo, push to origin main (it also triggers the Vercel deploy).**
