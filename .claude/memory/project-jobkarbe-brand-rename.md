---
name: project-jobkarbe-brand-rename
description: 2026-09-19 brand rename Jobkar → Jobkarbe across all user-visible
  website copy (29 files, build+114 tests green, uncommitted at session end) +
  Next.js title-template doubling gotcha
metadata:
  node_type: memory
  type: project
  originSessionId: sess_e4d19f73-b31f-4c78-b7c1-0189ac2cae1c
---

On 2026-09-19 the user ordered a full brand rename: "wherever there is jobkar make that jobkarbe in everything… mainly everything will be frontend only." Executed across 29 files in the website repo.

**Scope (all user-visible strings):** navbar wordmark (`Job` + accent-styled `karbe`), footer wordmark + copyright, every `<title>`/meta description, OG image card, JSON-LD `identifier.name`, checkout customer fallback name, terms/privacy/FAQ/contact/grievance copy, pricing "Launch price" badge line, homepage hero, dashboard/profile copy, toasts, save-heart tooltip, filter labels. Display casing used is **Jobkarbe** (user wrote "jobkarbe").

**Gotcha (caught in `.next` prerendered HTML):** with `title: { template: '%s | Jobkarbe' }` in `app/layout.tsx`, per-page metadata must NOT carry the brand suffix itself — my first pass wrote `title: 'FAQ | Jobkarbe'` per page and every page rendered `FAQ | Jobkarbe | Jobkarbe`. Fixed by stripping per-page suffixes to bare names (`'FAQ'`, `'Terms of Service'`, job-detail variants too). Verify title renders with a grep of prerendered HTML, not source.

**Deliberately NOT renamed (do not "complete" these later):**
- `jobkarsupport@gmail.com` — real Gmail inbox; renaming breaks mail delivery. Swap only after the user creates a new inbox.
- localStorage keys `jobkar:saved`, `jobkar:applied`, `jobkar:recent-searches` — invisible to users; renaming would silently wipe every existing user's saved jobs.
- Repo folder/package name, README, docs, supabase SQL comments — backend/repo metadata, not frontend.

Left uncommitted at session end (user to `git push` → Vercel deploy). Build 22/22 pages green, vitest 114/114 green after the change.

Related: [[feedback-no-ai-tells]], [[jobkar-brand-palette]], [[project-jobkar-rebuild]].
