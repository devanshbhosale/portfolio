---
name: project-premium-cards-page-bg
description: Locked-job cards — 2026-09-03 dark bg-gray-900 (88e7a31) SUPERSEDED
  2026-09-26 by white glassmorphism (b2c8f93): blur only company+location,
  salary/experience/tags clear; landing-only particle background unchanged
metadata:
  node_type: memory
  type: project
  originSessionId: sess_d81e5b9c-b557-405f-880f-8c496c9fc2fc
---

**SUPERSEDED 2026-09-26, commit `b2c8f93` live-verified**: locked cards are now **white glassmorphism** (`.card-glass` in `app/globals.css`: translucent white + backdrop-blur + inset highlight + navy-tinted shadow; solid-white fallback under `prefers-reduced-transparency: reduce`). **Blur policy narrowed to company row + location span only** (user request "blur company name and location only"); salary, experience, tags render clear — field set now parallels `JobCard`. User decision (AskUserQuestion): real company stays server-hidden — the blurred company row blurs the `'Top Employer'` placeholder; `lib/jobRedaction.ts` + its tests untouched. Same deploy fixed two leaks on `app/jobs/[id]`: ReportListingButton was getting the full locked title (mailto subject), and `teaser` was viewer-blind (`redactJob(job, false)` unconditionally) so PAYING premium users saw truncated title/placeholder company/no description — fix: `teaser = locked && isTeaser(...)`. Preship agent verdict was DO NOT SHIP until that one-liner; visual check via Playwright DOM probe (headless Chrome reports `prefers-reduced-transparency: reduce` by default, so the glass shows only via inline-style injection there — not a bug). Verified live: homepage HTML has `card-glass`, locked API rows clean, locked detail page shows only `title_prefix…` everywhere. Deferred: detail-page location blur, glass on PaywallModal/detail paywall box, jsdom blur-policy test, `hover:border-primary-400` dead class at `app/jobs/page.tsx:498`. Plan doc: `.zcode/plans/premium-card-glass-blur-plan.md`.

---

**HISTORICAL (2026-09-03, commit `88e7a31`)**: **Dark locked-job cards** (`components/BlurredJobCard.tsx`, per user's reference mock): dark `bg-gray-900` card, blue "Premium" pill top-left (`primary-500` — see gotcha below), "Locked" chip right, **only the title revealed** (server `title_prefix`; `lib/jobRedaction.ts` untouched so the rule is enforced server-side), blurred `aria-hidden` decoy rows, whole-card transparent button hit area (no nested buttons; pill is a visual `<span>` inside) + orange "Unlock from ₹X" pill. User decisions: **orange pay CTA** (mock's blue rejected — palette-consistent) and **translucent stats band** (`bg-primary-600/85`). Price unknown → plain "Unlock", never a wrong/NaN number (₹0 is a legal price).

**Price sourcing**: Weekly (entry-plan) price live from `site_settings`. Homepage = server `getSiteSettings()` wrapped in the pricing-page try/catch → `defaultSettings()` fallback (unguarded call would 500 the whole page on a DB blip). `/jobs` = one-shot `fetch('/api/settings')` in the mount-only effect (NOT inside `load()` — the 90s/focus refetches skip it), `typeof === 'number'` guard. Live DB Weekly = **₹149** (14900 paise); local dev DB = ₹99 — the label is intentionally env-specific (dashboard-editable).

**Full-page motion background, landing ONLY**: `fixed inset-0 -z-10 pointer-events-none` canvas layer in `app/page.tsx`; hero gradient `opacity-40`; page wrapper `bg-white` + features `bg-gray-50` removed (body gray-50 base); `HeroParticles` drops IntersectionObserver + `visible` (fixed host is always on-screen), window-level `pointermove` parallax with matching cleanup, `pointerleave` dropped entirely (≤14px lingering parallax accepted), `wake()` after `resize()` starts the rAF loop. Canvas unmounts on route change — verified absent on `/pricing`. Paint-order verified: no stacking context in the layout chain, so `-z-10` paints above body bg, below section/card bg.

**Reusable gotchas found by the loop**: Tailwind config has **no `primary-300/400/800`** (primary = DEFAULT,50,100,200,500,600,700,900) and accent only DEFAULT/50/500/600 — silent no-op classes, no build error. `getSiteSettings()` throws fail-closed on DB errors; every marketing-page call needs the try/catch fallback. `/api/settings` is public and also returns `commissionTiers` (pre-existing leak, flagged out of scope). SSR/anon checks confirmed: locked rows still leak nothing; smoke script remains the post-deploy gate.

**Process**: user denied the first plan approval, asked to "run a loop and check for flaws" — 2-pass flaw-check loop (pass 1: two attack agents, 13 findings, 5 must-fix; pass 2: one agent verified every fix against source) → revised plan approved → ponytail governed implementation (5 files, no new deps) → pre-ship review agent verdict SHIP WITH FIXES (misleading "cheapest" comments fixed, stray `app/New Text Document.txt` + stale `app/globals.css.txt` deleted). Known state at ship: homepage "Latest Opportunities" shows all-free rows because the newest premium jobs sit deeper in the feed — locked cards visible on `/jobs?tier=premium`.

Related: [[jobkar-brand-palette]], [[feedback-trust-enforcement]], [[feedback-quality-first]].
