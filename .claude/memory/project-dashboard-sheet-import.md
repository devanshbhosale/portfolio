---
name: project-dashboard-sheet-import
description: Hardened plan (NOT yet approved/implemented) for dashboard
  sheet-import drop zone + Gemini agent fine-tune; survives a 2-round
  adversarial review loop on 2026-08-21
metadata:
  node_type: memory
  type: project
  originSessionId: sess_8b771b81-6076-4b25-bcea-7dc2c1e7009c
---

Requested 2026-08-21: "fine tune the agent more and add a field where I can drop sheets file which contains jobs". User answers: smarter extraction (not wider triggering), XLSX+CSV, stage + Submit-all, template + header aliases. Model choice: **gemini-2.5-flash** (user picked latest stable over gemini-3-flash-preview). SheetJS **xlsx@0.20.3 from the CDN tarball** (npm registry frozen at 0.18.5 with CVEs — CDN is authoritative). Existing stack (Electron 43/React 18/TS 5.4/zod 3/Vitest 2) deliberately untouched.

**Status: plan v3 hardened via user-requested review loop ("run a loop to find flaws in this plan") — 4 parallel reviewers (security/testing/UX; correctness hit concurrency limit) + 1 round-2 correctness reviewer — then ExitPlanMode was DENIED. Parked awaiting user direction; nothing implemented, no commits.**

Key architecture decisions locked by the review:
- **Parse sheets in the RENDERER** via `file.arrayBuffer()` — a main-process `sheet:parse` IPC taking a renderer path is an arbitrary-file-read oracle (round-1 critical). Zero new IPC, no webUtils, preload untouched; also sandboxes future SheetJS parser bugs away from the Gemini key.
- **Prompt-injection hardening**: Gemini `apply_url` accepted only if registrable domain matches the page's — naive last-two-labels fails on `.co.in` (India-relevant), so hardcode a ccSLD list and fail closed; tier-3 `source_link` must be anchored to `unit.sourceUrl` like every other tier (today it returns raw model output).
- Agent: structured prompt + few-shot + delimiters/"data not instructions", repair-once loop on zod failure, `thinkingBudget: 0`, thread `geminiFetcher` + injectable sleep through `scrapeUnit`/`BulkOptions` (today hardwired global fetch = untestable).
- Queue state machine: `start()` must append (not replace) staged rows; scraped keys namespaced `scrape:{runId}:{url}`; `done`/`failed` events gated on `queued|running` (else re-scrape flips `submitted`→editable = double submit); new `'submitting'` (set before RPC) + `'submit_failed'` statuses; tab-switch + sign-out guarded during batch (remount kills the loop).
- **No Premium column** — `submit_job` RPC has no `p_is_premium` param (premium is approve-time only); a template column for it would silently do nothing.
- Pure `src/lib/sheet/{parse,staging}.ts` modules so all logic is testable in node-env vitest (no jsdom installed); re-drop preserves `submitted` rows; `test/**` currently in NO tsconfig → needs `tsconfig.test.json` + CI wiring.
- UX fixes surfaced: edit modal lacks source_link/tags fields (dead-end errors), Electron blob downloads are silent (need `will-download` + save dialog), cp1252/UTF-16 CSVs mangle Devanagari (BOM sniff + fatal UTF-8 → cp1252 fallback + amber warning), ReviewTab hardcodes limit 200 and approve-refetch snaps depth back.
- Deferred deliberately (avoid live-DB churn): server-side `submit_job_batch`/ON CONFLICT dedupe, `.xls` support, jsdom UI tests.

See [[project-jobkar-rebuild]], [[job-scraper-pipeline-design]], [[feedback-quality-first]].
