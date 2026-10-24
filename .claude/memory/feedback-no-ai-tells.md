---
name: feedback-no-ai-tells
description: 2026-09-19 standing rule — no em/en dashes in user-visible copy;
  user says "—" makes the site look AI-built
metadata:
  node_type: memory
  type: feedback
  originSessionId: sess_e4d19f73-b31f-4c78-b7c1-0189ac2cae1c
---

2026-09-19, during the Jobkarbe rename: "avoid '—' it depicts that the site is build by ai." The user wants zero em dashes (—), en dashes (–), and stray non-breaking hyphens (U+2011, found twice in `blue‑collar`) in anything a visitor can read.

**Why:** dashes read as an AI-writing tell, and the site's audience is scam-wary blue-collar jobseekers where an AI-generated feel is an active trust liability (same reasoning as [[jobkar-brand-palette]]).

**How to apply:** when writing or editing any user-facing string (titles, meta descriptions, legal pages, toasts, tooltips, aria-labels, buttons), rewrite dashes as natural prose — commas, colons, parentheses, "to" for ranges (`5–7 working days` → `5 to 7 working days`), or split sentences. Code comments are exempt. Before shipping copy changes, sweep with a grep for `—`, `–`, `‑` across app/components/lib and confirm remaining hits are comment lines only. Pairs with [[feedback-no-gibberish]] (all visible prose clean English).
