---
name: feedback-planning-style
description: 2026-09-06 planning-style rules — apply judgment to trim plans to
  only what matters for the product's actual scale; name the
  agents/plugins/skills in the plan; save plans to a docs file and gate
  execution on the explicit "build this plan" command
metadata:
  node_type: memory
  type: feedback
  originSessionId: sess_cb287a5f-da07-4134-aa71-aed175152f06
---

Two instructions from the Jobkar compliance-planning session (2026-09-06), both durable:

1. "u know what our website is for so think thoroughly and tell only the important changes" — when proposing work, first reason about what the product actually is and where its real exposure/value lies, then cut the plan to only those items. Compliance-maximalist / checklist-comprehensive lists got pushback; the accepted plan kept ~12 items across 4 real risk surfaces and explicitly deferred the rest WITH concrete triggers (e.g. TDS when a referrer nears ₹18k/FY, cookie banner the day analytics ships).
2. "make a proper plan of these 12 points and add necessary agents,plugins,skills in the plan also and save it till i say build 'this' plan" — plans should (a) be written as a durable doc in the repo (e.g. docs/COMPLIANCE-PLAN.md), (b) explicitly name which agents/plugins/skills run at each stage, and (c) stay dormant until the user says "build this plan" — never start executing just because a plan was approved/saved.

**Why:** the user runs a solo side-hustle ([[user-sidehustle-profile]]); effort spent on scale-inappropriate work costs them directly, and they want control over when planned work goes live.

**How to apply:** when asked to plan, do a risk/scale triage first and say what you deliberately left out with its trigger; store the plan as a repo doc with a Phase-0 save-and-stop step; include a Ship Process section naming the tools (e.g. code-review-preshipment, prod-logs-health-check, smoke script per [[feedback-trust-enforcement]]); end at Phase 0 and wait for the literal "build this plan" go-command.

Related: [[feedback-quality-first]] (exhaustive analysis BEFORE planning still holds — thorough thinking, minimal scope), [[feedback-trust-enforcement]], [[jobkar-legal-compliance-audit]].
