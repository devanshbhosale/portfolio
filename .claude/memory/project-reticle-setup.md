---
name: project-reticle-setup
description: Reticle was wired into jobkar + cloud "Default" (2026-09-25), used to monkey-test checkout (clean), then removed 2026-09-26 at user's choice — BUT @reticlehq/next + @reticlehq/react remain in devDependencies (hygiene flaw #8 in [[jobkar-security-posture]]); lessons remain if ever re-installed
metadata:
  node_type: memory
  type: project
  originSessionId: sess_9ac4821b-5461-40ba-94ca-faed772c048e
---

Reticle (`@reticlehq/server` v3.2.0, docs.reticle.sh) was set up 2026-09-25 (login via Gmail device flow, `link --project default`, 11 flows + intents pushed to cloud project "Default") and used to monkey-test the checkout flow — all clean: signed-out gate → `/login?next=/pricing`, modal "Selected plan: Weekly at ₹149", `POST /api/create-checkout` 200 (556ms) returning a real `checkout.dodopayments.com/session/cks_…` URL. Nothing in the checkout path was broken; one unpaid live Dodo session `cks_0NoNcpx2ST0TtsdjVY…` was created (harmless, expires).

**REMOVED 2026-09-26 — user's explicit choice.** Setup was one-off test tooling for them, not a standing workflow. Removed: `@reticlehq/*` deps (manifests verified identical to HEAD after), `git checkout` of `next.config.js` + `app/layout.tsx`, deleted `app/reticle-dev.tsx`, `AGENTS.md`, `RETICLE.md`, `.reticle.json`, `.reticle/`, `.cursor/`, and the `.mcp.json` reticle entry; `reticle logout` ended the cloud session. Repo verified back to pre-setup git state (only the original uncommitted brand work remains). The 11 pushed flows stay on app.reticle.sh (project "Default") unless deleted in the dashboard.

**Why:** user is cost-conscious ([[user-sidehustle-profile]]). Production was never affected either way — all Reticle wiring was dev-only (`withReticle` no-ops in prod builds; bridge component rendered null). The decision was repo hygiene + workflow: they declined a standing browser-verification layer; their existing quality loop (vitest + smoke scripts + preship agent) stays the norm.

**How to apply (if Reticle ever comes back):**
- This repo's strict CSP `connect-src 'self' https:` silently blocks the `ws://localhost:4400` bridge dial — needs a dev-only `ws://localhost:*` connect-src addition; every page fails to connect with NO server-side error otherwise.
- `captureNetworkBodies: true` in `reticle.connect()` is required for net `bodyContains` asserts; HMR does not re-run `connect()` — hard reload needed (which itself tears the session down).
- One-shot MCP-over-HTTP scripts flap "Agent stopped → sessions_ended" per call and kill 300s leases mid-run; use a single-session batch client (`~/.zcode/tmp/reticle-batch.mjs`; one-shot: `reticle-mcp.mjs`).
- Predicate shapes need `kind:` (`{kind:"route","pathname":…}`, `{kind:"text","contains":…}`, `{kind:"net",…}`); `confirmDangerous` goes inside the act's `args` (top-level rejected); `reticle_assert` takes `intent:` (not `intentId:`).
- explore/autodrive needs no local API key once linked, but it **clobbers `.reticle/intent.json`** (declared intents lost — re-declare after) and its auto-declared per-click consequences produce false failures on self-links and dev-compile-latency navigations.
- External hosted-checkout handoffs can never yield an `act_and_wait` verdict (SDK teardown on navigation) — prove via net assert on the create-checkout response.
- CLI is always `npx @reticlehq/server <cmd>`; there is NO `session` subcommand. Valid: init, serve, stop, kill, restart, status, doctor, open, verify, affected, gate, watch, drive, mcp, update, rollback, license, telemetry, feedback, identify, login, logout, link, whoami, project, config, push, sync, runs, regression, share. `reticle verify` CLI refuses while the daemon owns 4400 — use `reticle_run {tool:"reticle_verify"}` through the daemon instead. Daemon idle-exits after 5 min unattached.
