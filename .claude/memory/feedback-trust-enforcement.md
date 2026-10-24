---
name: feedback-trust-enforcement
description: User's standing rule (2026-08-24) — trust-critical promises
  (paywalls, privacy, stats) must be enforced server-side and proven by
  failing-loudly tests; never UI-only, never invented numbers
metadata:
  node_type: memory
  type: feedback
  originSessionId: sess_0cfcaa79-9cb1-467a-b9db-f284d92e53ed
---

After the audit surfaced a CSS-only paywall (full `apply_url` shipped to anon browsers), a hardcoded
`98%` "Success Rate" rendered beside live counters, and dead legal links while collecting bank details,
the user set a standing rule: "in future don't make silly mistakes like this."

**Why:** each failure was a trust-critical promise enforced (or fabricated) only in the UI layer. For an
audience constantly targeted by pay-to-unlock job scams, a leaky paywall or a fake stat isn't a polish
issue — it pattern-matches the product to the scams.

**How to apply:** before shipping anything that promises access control, privacy, or a number:
(1) enforce it at the server/data layer (RLS, grants, route handlers) — never rely on CSS/JS hiding;
(2) add a test that fails loudly if the enforcement regresses (e.g. `test/jobRedaction.test.ts` tripwire);
(3) never render a stat that isn't computed from real data — remove it if it can't be computed;
(4) run the pre-shipment review agent before every deploy and `scripts/smoke.mjs` after.

Related: [[jobkar-hardening-plan]], [[project-ux-audit-gap]], [[feedback-quality-first]].
