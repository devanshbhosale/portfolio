---
name: feedback-quality-first
description: User wants exhaustive production-grade analysis before any
  implementation; no rushing
metadata:
  node_type: memory
  type: feedback
  originSessionId: sess_6c20739e-3d54-4f65-bbfe-ccf1be42136e
---

The user repeatedly rejected the implementation plan until a full gap-audit loop was run (code-review agent + reading every source file) and demanded "foolproof and production grade" quality.

**Why:** the project is a money-generating side hustle, and the pasted plan document contained blocking bugs (broken auth, missing RLS policies, forgeable payment amounts).

**How to apply:** for this project, audit plans and code against production realities (security, idempotency, RLS, typed code, error states) before proposing implementation; present findings explicitly rather than glossing over gaps; take time to be thorough — the user prefers depth over speed. Note: they may pick *only some* proposed enhancement packs — ask via multi-select rather than assuming.

Additional working-style signals (2026-08-21):
- **Adversarial review loops are now the expected bar**: user explicitly asked "run a loop to find flaws in this plan" before approving — launch parallel reviewer agents (security/correctness/testing/UX) against the plan, fold confirmed findings in, re-attack the revision once, then present. Watch agent concurrency limits (one reviewer died on "user concurrency limit exceeded").
- **Ask clarifying questions proactively** — user wrote "ask questions" in the feature request itself; use AskUserQuestion with recommended options before finalizing plans.
- **Verify library currency, don't assume**: "u r using latest libraries and langs right?" — check current versions via web search (e.g. npm xlsx stuck at 0.18.5 while CDN has 0.20.3; gemini-2.0-flash two generations old). Prefer latest STABLE (user chose gemini-2.5-flash over a preview), but don't churn existing frameworks inside a feature change — state that tradeoff.

Reinforced 2026-09-03 (locked-cards + page-bg feature):
- **Plan-mode + loop is now the approval path**: the user denied the first ExitPlanMode and asked to "run a loop and check for flaws" — the shape they expect is: plan → exit for approval → on pushback, run flaw-check agents (pass 1 attacks the plan from multiple angles, pass 2 verifies every fix against source), fold findings in, re-present. The loop-verified plan was then approved without changes.
- **Plans must explicitly wire in agents/skills by name**: user asked to "add necessary agents and skills like $ponytail in the plan" — name ponytail (minimal-diff governance), the pre-ship review agent, and the post-deploy smoke script as plan steps.

Refined 2026-09-06 (legal-compliance planning):
- **Audit exhaustively, but plan minimally.** After receiving the full Indian legal audit plus a thorough 3-phase implementation plan, the user pushed back — "u know what our website is for so think thoroughly and tell only the important changes" — wanting judgment applied, not every finding converted into a work item. The accepted shape: derive the product's real risk surfaces first (for Jobkar: paid access, scraped third-party content, referral payouts, PII+bank data), ship only changes protecting those (mostly copy at this scale), and park everything else in an explicit deferred-with-triggers table so nothing is forgotten but nothing bloats the plan. Depth of analysis stays maximal; scope of the presented plan does not.
