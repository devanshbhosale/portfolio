---
name: jobkar-brand-palette
description: User-defined Jobkar four-color brand system (2026-08-23) with
  strict per-role usage scoping — governs all current and future UI work
metadata:
  node_type: memory
  type: project
  originSessionId: sess_0cfcaa79-9cb1-467a-b9db-f284d92e53ed
---

The user hand-specified Jobkar's official palette on 2026-08-23, replacing my proposed teal/amber scheme in the hardening plan:

- **Brand navy `#0F2A4A`** — header, footer, headings
- **Action blue `#1D4ED8`** — buttons, links
- **Verified green `#059669`** — trust badges and payment success ONLY
- **Upgrade accent `#F97316`** — the pay/upgrade CTA ONLY

**Token mapping (hardening-plan Phase C):** `primary` ← #1D4ED8 (replaces stock Tailwind blue-600 #2563EB; ~70 `primary-*` class usages inherit automatically); `success` ← #059669 (replaces #10B981); new `navy` token family with derived tints for hovers/borders; `accent` keeps #F97316 but its usage gets scoped — existing decorative accent/green class usages are swept to navy/primary during the Phase-C audit. Semantic red stays errors-only. Sole hardcoded color literal: Razorpay checkout `theme.color` (app/pricing/page.tsx:158) → #1D4ED8. OG image uses navy background + action-blue accents. Font pairing: Poppins display (Devanagari-ready) + Inter body.

**Why:** the stock blue/orange Tailwind defaults pattern-matched a generic template, which the UX audit flagged as an active trust liability for a scam-targeted audience; the user's strict scoping keeps green/orange meaningful as signals instead of decoration.

**How to apply:** any new UI in either repo uses these four roles only; never reach for default Tailwind blues/oranges/greens for brand moments, and never use green or orange decoratively.

**Token home changed 2026-09-26:** Tailwind 4 migration deleted tailwind.config.ts — the palette now lives as `@theme` CSS variables in `app/globals.css` (`--color-primary*`, `--color-navy*`, `--color-accent*`, `--color-success`, plus `--font-*` and `--shadow-card*`), hex-for-hex identical (preship-verified). Browser screenshots after migration confirmed the palette renders unchanged.

Related: [[jobkar-hardening-plan]], [[project-ux-audit-gap]], [[user-sidehustle-profile]].
