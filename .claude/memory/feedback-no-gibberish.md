---
name: feedback-no-gibberish
description: User got repeated garbled/gibberish assistant output and called it
  out ("y again gibrish"); keep output clean, English-only, and restart cleanly
  if it corrupts — explicitly re-demanded 2026-08-24
metadata:
  node_type: memory
  type: feedback
  originSessionId: sess_8b771b81-6076-4b25-bcea-7dc2c1e7009c
---

The user complained twice ("y again gibrish" / "u r gibrish?") that assistant output was garbled or unintelligible mid-task. On 2026-08-24 the user again said **"write in english only"** after a short status note between tool calls came out in Chinese — the user sees every tool-call-adjacent message, not just final summaries.

**Why:** garbled output wastes the user's time and erodes trust, especially on a long multi-phase build like [[project-jobkar-rebuild]].

**How to apply:** always keep visible prose clean, complete sentences, **English only — every message, including one-line progress notes between tool calls**. If a generation ever comes out corrupted or degenerate (or in another language), do not continue from it or ask the user to decode it — apologize in one line, restate where the work stands, and resume the actual task with tool calls.
