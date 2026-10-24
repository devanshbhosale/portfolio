---
name: project-upi-payout-rail
description: UPI payout option DEPLOYED + VERIFIED 2026-09-09 (fb9a233 both
  repos, migration applied, E2E + smoke all-pass); gotcha = PostgREST overload
  ambiguity (create-or-replace with a new arg list never drops the old signature
  — always drop function the old overload first); deploy order is two-sided
  load-bearing
metadata:
  node_type: memory
  type: project
  originSessionId: sess_117ca7ed-145d-44d6-867b-17ca36c7a748
---

**UPI payout rail LIVE 2026-09-09** (executed per docs/UPI-PLAN.md, plan now historical). Website `fb9a233` pushed (Vercel live), dashboard repo `7a02ea8` committed + built, migration `supabase/live-fixes/2026-09-08-upi-payouts.sql` applied. Design: `profiles.upi_id` (13th column-granted safe column), `set_own_upi(text)` RPC (own-row, security definer), `request_withdrawal(p_amount, p_method default 'bank')` snapshots `payout_method`+`upi_id` onto the request row; operator dashboard WithdrawalsTab shows Payout rail per request. Honest copy everywhere (payouts are operator-manual — no "instant" claims).

**PostgREST overload gotcha (2nd occurrence — first was 3-arg update_own_profile):** `create or replace function` with a NEW arg list NEVER drops the old signature; PostgREST then resolves an omitted-optional-arg body (`{p_amount}`) against BOTH overloads → AmbiguousRpc HTTP 300, breaking every live caller until the next deploy. Rule: when changing an RPC's signature, ALWAYS `drop function if exists public.<name>(<old args>)` in the same live-fixes migration BEFORE the create. Verified live: old-bundle `{p_amount:1}` → "minimum withdrawal is 500", not PGRST203.

**Two-sided load-bearing deploy order for RPC/column changes:** 1) commit both repos, 2) apply migration to live DB (with the old-overload drop), 3) verify (has_function_privilege anon=false, exactly ONE overload in pg_proc, column_privileges count), 4) build operator dashboard, 5) push website last. Site-before-migration = AuthContext's new-column select fails → mass logout; migration-before-site without the overload drop = live withdrawals 300. (E2E proved the order: old bundle kept working during the gap.)

E2E notes: Test Buyer UPI save → `e2ebuyer@upi` persisted lowercase (RPC lowercases); ₹500 UPI withdrawal row verified (payout_method 'upi', bank cols snapshotted, status pending); GET /api/withdrawals serves safe columns only (no upi_id/bank) — that route is cookie-auth, not bearer (test via browser fetch, not curl). Seeded ₹600 commission + withdrawal row deleted after; UPI ID left on profile (harmless). Smoke 24/24 incl. new /privacy "UPI payout collection" needle.

Related: [[jobkar-legal-compliance-audit]], [[feedback-trust-enforcement]], [[reference-supabase-access]], [[reference-chrome-automation]]
