---
name: jobkar-ponytail-audit-2026-08-24
description: Repo-wide complexity audit (ponytail-audit skill) of both jobkar
  repos, 2026-08-24 — 8 ranked cuts, net -75 lines/-2 deps; repos otherwise
  verified lean
metadata:
  node_type: memory
  type: project
  originSessionId: sess_6232b05c-477b-4a91-b8d5-10e8d0b7f230
---

Repo-wide ponytail-audit (complexity/over-engineering only, no cuts applied yet) of jobkar website + jobkar-dashboard, 2026-08-24. Read every tracked source file in both repos (~4.6k + ~6.7k lines + 73-test surface). Ranked cuts, biggest first:

1. `delete:` `.home.html` — 23 KB git-tracked design artifact (old landing draft), zero references [jobkar]
2. `delete:` `commissionFor()` + `extendedExpiry()` in lib/money.ts — dead outside their own tests; extension lives in process_payment() SQL [jobkar]
3. `delete:` `filtersActive()` in lib/jobsFilters.ts — dead outside its test; /jobs computes `clientFiltersActive` inline [jobkar]
4. `shrink:` `cn()` (lib/utils.ts) has one call site (components/ui/Button.tsx) and is the only consumer of clsx + tailwind-merge → inline a filter/join, drop both deps [jobkar]
5. `delete:` scrape-event union exists 3× (`BulkScrapeEvent` shared/types.ts, `BulkEvent` queue.ts, `ScrapeIpcEvent` preload.ts + global.d.ts) and nobody emits the `'queued'` op → one definition in shared/types [jobkar-dashboard]
6. `delete:` `friendlyError()`'s "error stringified as JSON issue array" branch — untested, no emitting path [jobkar-dashboard src/lib/scrape/queue.ts]
7. `yagni:` `DecodeHeading` `duration` prop never passed (1300ms default only) [jobkar]
8. `yagni:` legacy `search`/`category` param aliases in `filtersFromParams()` parsed but emitted nowhere [jobkar]

**net: −75 lines, −2 deps possible (clsx, tailwind-merge).**

Verified clean — no cut: framer-motion (14 files), lucide-react (21), razorpay, zod, undici (dispatcher is load-bearing: Chromium's global fetch ignores it), cheerio, xlsx, recharts, electron-log, rate-limiter, redaction layer, HostGate, all Button props exercised across 23 call sites. Website↔dashboard Toast duplication is two separate repos with no shared workspace — sharing costs more than it saves, deliberately not flagged.

**Out-of-scope route (correctness, not complexity):** app/dashboard/page.tsx:84 renders a hardcoded fake bank mask `•••• 0000` for connected accounts — needs a normal review pass / real masking fix.

**Why:** user asked for a precise, miss-nothing repo-wide complexity audit; findings are the actionable backlog for a cleanup PR.
**How to apply:** if user asks to "apply the audit" or cut complexity, execute items 1–8 in order; keep item 4's dep removal together with the cn() rewrite; treat the maskedAccount bug as separate correctness work. Relates to [[jobkar-hardening-plan]] (already shipped) and [[project-review-queue]].
