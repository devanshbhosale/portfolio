---
name: feedback-self-serve-ops
description: When tooling exists (Supabase MCP, gh, etc.), execute DB/infra
  steps directly instead of handing the user manual runbook steps
metadata:
  node_type: memory
  type: feedback
  originSessionId: sess_0cfcaa79-9cb1-467a-b9db-f284d92e53ed
---

2026-08-24: I left "run this SQL in the Supabase SQL editor" as a user action; the
user replied "supabase mcp is loaded ig so edit sql files urself" — and the MCP
path did work (migration applied + verified: grants gone, anon REST 401).

**Why:** hand-back checklists recreate the toil the agent was brought in to remove,
and manual steps stall security fixes — the paywall revoke sat waiting for a human
while the leak was still open.

**How to apply:** before writing "user must run/apply X" for any DB, repo, or config
step, check for a tool path first (Supabase MCP execute_sql/apply_migration, gh CLI,
etc.) and use it; verify the applied state afterward (catalog queries, live HTTP
checks). Reserve user steps for things genuinely requiring their credentials or
judgement — Vercel deploys, Razorpay LIVE keys, business calls.

Machine reality check 2026-09-26: **`gh` is NOT installed on this machine** (verified via PATH probe) — pushes go through plain `git push` with stored credentials; the Vercel CLI IS authenticated (`npx vercel whoami` = devansh04b-4705) but intermittently throws worker-spawn/EPIPE errors — retry once before concluding a tool path is dead. Never report a tool as available or unavailable from a single failed probe.

Related: [[feedback-trust-enforcement]], [[jobkar-hardening-plan]], [[jobkar-security-posture]].
