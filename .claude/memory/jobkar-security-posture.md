---
name: jobkar-security-posture
description: Security posture 2026-09-26 — npm audit 0, 8-item severity-rated flaw list DELIVERED (1 HIGH JSON-LD, 1 MEDIUM CSP, rest LOW); audit run order stable across FIVE user-requested verification loops (skeleton unchanged since loop 2); fixes NOT started, awaiting user go; machine facts — Vercel CLI authenticated, gh NOT installed
metadata:
  node_type: memory
  type: project
  originSessionId: sess_9ac4821b-5461-40ba-94ca-faed772c048e
---

Security status 2026-09-26 (after the [[dependency-upgrade-plan]] deploy). I told the user "no KNOWN vulnerabilities", not "zero flaws" — never claim an unfalsifiable absolute. User then asked for a severity-rated flaw list "then we will fix them": **list delivered, fixes NOT started, awaiting user's pick.**

**Verified clean (evidence-backed):** `npm audit` 0 (full tree + `--omit=dev`); cron endpoints use timing-safe Bearer CRON_SECRET auth; Dodo webhook signature verification; verify-payment checks session + ownership (plain eq(), no .or() disjunct injection); create-checkout/jobs/withdrawals/reports all call rateLimit; zod at every trust boundary; secrets never committed (.env* gitignored, zero git history); open-redirect guard on `?next=`; exactly ONE dangerouslySetInnerHTML in app code; auth gate 307s live via proxy; paywall redaction server-side with failing-loudly tests; Supabase anon role locked.

**THE FLAW LIST (delivered 2026-09-26, ordered, my recommendation = fix #1 now, #2 as focused task, 3-7 batched):**
1. **HIGH — JSON-LD script injection**: `app/jobs/[id]/page.tsx:77` embeds `JSON.stringify(buildJobPostingLd(...))` (contains scraped `job.description`/`job.title` from THIRD-PARTY sites via the automated pipeline) into `<script type="application/ld+json">` without escaping `<` — a `</script><script>` payload in a scraped description breaks out. Dashboard approval does NOT neutralize it (operator sees rendered text; payload lives only in the script tag). One-line fix: `.replace(/</g, '\\u003c')`. Combined with #2 it is the real exploit path.
2. **MEDIUM — CSP `script-src 'unsafe-inline' 'unsafe-eval'`** (next.config.js, documented trade). Fix = nonce-based CSP under Next 16 (real but well-documented change). No third-party scripts mitigates.
3. **LOW — rate limiter is in-memory + per-serverless-instance** (lib/rate-limit.ts, documented ponytail trade); upgrade path = Upstash.
4. **LOW — /api/verify-payment (auth-gated) and /api/settings (public, force-dynamic DB read) have NO rate limit.**
5. **LOW — PricingPlans 30s payment-poll loop not aborted on unmount** (pre-existing; wasted cycles + stray toast).
6. **LOW — no Permissions-Policy header** (one config line).
7. **LOW — savedJobs useSyncExternalStore bridge untested** (needs jsdom or injectable window; the layer where the refcount bug hid).
8. **HYGIENE — `@reticlehq/next` + `@reticlehq/react` STILL in devDependencies** despite the uninstall ([[project-reticle-setup]] — wiring was removed, deps were not); dev-only, never shipped.

**Audit-agent run order — CORRECTED TWICE 2026-09-26** (user challenged v1 with "r u sure run order is correct?", then had me run one more self-review loop; supersedes the 2026-08-20 order in [[project-review-queue]] for the website repo). v1 had 3 flaws (logs placed too late — runtime evidence runs first; a fake sequence that was actually parallel; no fix-known-first step). The second loop found 3 more: (a) the fan-out's security dimension duplicates threat-model + specialist coverage → trim it to **performance + testing only**; (b) the fan-out is the priciest run (~925k tokens for one preship agent) → add a **user checkpoint after the threat model** to decide its scope; (c) state the duty split so agents don't re-review the same webhook route. Final order:
- **Step 0, before any agent:** flaw-#1 JSON-LD escape (one line) + gates + PUSH — it is a live-site security fix and ships immediately.
- **Wave 1, fully parallel:** `code-explorer` (attack-surface map, verifies stale session memory) + `prod-logs-health-check` (runtime evidence; Supabase logs via MCP, Vercel via CLI) + `frontend-security-coder` (client-side sinks).
- **Merge point (me):** fold wave 1 output into one briefing.
- **Wave 2:** `threat-modeling-expert` on that briefing (server-side authz/abuse paths are ITS duty, not the fan-out's).
- **Checkpoint (user):** read the threat list, decide if/where the fan-out runs.
- **Wave 3 (conditional, trimmed):** `team-reviewer` fan-out via `team-lead` — **performance + testing-coverage dimensions ONLY** (security dimension dropped as duplicate).
- **Standing, not sequenced:** `code-review-preshipment` per-deploy gate; `accessibility-expert` anytime; optional checkout E2E via GUI tester if the threat model flags payment paths; low-priority: `code-architect`, `incident-responder`.
Agent-audit menu also delivered (threat-modeling-expert, frontend-security-coder, code-reviewer, team-reviewer/team-lead, code-explorer, code-architect, prod-logs-health-check, incident-responder, accessibility-expert) plus skills (security-scanning SAST/STRIDE/attack-tree set, ponytail-audit). Offered "say go and I'll run step 0 plus wave 1" — user has NOT answered yet.

**Corrections to older memories:** dashboard bank mask is REAL data now (`user.bankLast4` at app/dashboard/page.tsx:114, `•••• ${bankLast4}`) — the [[jobkar-ponytail-audit-2026-08-24]] claim of a hardcoded fake `•••• 0000` mask is FIXED. create-checkout rate limit = 5/min per user. HSTS without preload is intentional + documented (not a flaw). localStorage job memory is a by-design private-mode fallback with remote sync for logged-in users (not a flaw).

**Not done:** dedicated threat-model pass never executed (sits in [[project-review-queue]]); offered twice, user has not green-lit it.
