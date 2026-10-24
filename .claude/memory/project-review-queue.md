---
name: project-review-queue
description: Prioritized run order of security/testing/optimization agents for
  Jobkar's two repos, delivered 2026-08-20 on user request ("圆list available
  tools 拉oil round, no execution")
metadata:
  node_type: memory
  type: project
  originSessionId: sess_8b771b81-6076-4b25-bcea-7dc2c1e7009c
---

**2026-09-26 UPDATE — the website-repo portion of this order was refined TWICE (user challenged, then a self-review loop) into the final order now canonically stored in [[jobkar-security-posture]]: step 0 = ship the JSON-LD fix first → wave 1 parallel (code-explorer + prod-logs-health-check + frontend-security-coder) → threat-modeling-expert → USER CHECKPOINT → trimmed team-reviewer fan-out (performance + testing ONLY; security dimension dropped as duplicate coverage). Razorpay references below are stale (Dodo since). Dashboard items (electron, scrape SSRF) still stand as written.**

On 2026-08-20 the user asked for a no-execution inventory of agents/skills to optimize and security-test the dashboard and website. Delivered a prioritized run order (to execute when the free-model quota/concurrency limit clears — 4 prior agent-review attempts failed on it):

1. `team-lead` + 4× `team-reviewer` (security/architecture/testing + specialist) per repo — the parallel review from plan step 7 that hit the limit.
2. `threat-modeling-expert` standalone on the dashboard: STRIDE keyed to `src/lib/scrape/fetch.ts` (SSRF/DNS pinning), IPC handlers in `electron/main.ts` (`scrape:bulk`, storage bridge), safeStorage session file, `dashboard.config.json`.
3. `payment-integration` + `pci-compliance` on Razorpay/withdrawal paths (money code — highest weight per review).
4. `web-gui-tester` for the website once it runs locally (login/pricing/jobs realtime).
5. `javascript-testing-patterns` to fill test gaps: money math (`lib/money.ts` holding-period logic, currently only implicitly tested) and withdrawal state machine. Website has 6 tests, dashboard 16.
6. `github-actions-templates` for website CI gate (desktop CI exists; website CI/CD is a gap).
7. Ponytail trio (`ponytail-audit` → `ponytail-review` → `ponytail-debt`) as cheap sweepers anytime.

Also mapped: `frontend-security-coder`/`frontend-security-coder` for XSS/CSV-injection/open-redirect spots, `code-review-preshipment` as single-agent verdict pass, `attack-tree-construction` for the leaked-.exe threat (no-DB-key design), `secrets-management` for key handling, `cicd-automation` set, UI/UX/SEO skills for the public site. Irrelevant to this project: android-emulator, kubernetes, quant-trading, python skills.

See [[project-jobkar-rebuild]], [[feedback-quality-first]].
