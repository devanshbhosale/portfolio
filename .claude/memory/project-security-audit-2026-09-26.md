---
name: security-audit-2026-09-26
description: Full security audit pipeline EXECUTED 2026-09-26 — step 0 JSON-LD fix shipped (9a7ffbe), wave-1 (surface map + client audit + prod logs) + wave-2 STRIDE done; top risks = secrets in OneDrive, operator MFA, silent fulfillment failure, 15-min commission hold; 8 cheap wins listed; accepted-risks list closed ~10 scary-but-fine items
metadata:
  node_type: memory
  type: project
  originSessionId: sess_9ac4821b-5461-40ba-94ca-faed772c048e
---

Security audit pipeline executed 2026-09-26 (user approved "go"). Concurrency limit = 1 background agent at a time (two bounced with "user concurrency limit exceeded", relaunched serially). Pipeline: step 0 JSON-LD `</script>` escape shipped `9a7ffbe` (scraped description could break out of the ld+json script tag; `<` → `\u003c`; also fixed stale "no user input" comment) → wave 1 (code-explorer surface map, prod-logs evidence, frontend-security client audit) → merge (+ live DB posture via Supabase MCP execute_sql; PAT helper sq.mjs 401s, expired) → wave 2 STRIDE threat model.

**TOP RISKS (user checkpoint pending decisions):** B6-01 HIGH secrets (.env.local w/ service-role+Dodo keys) in OneDrive-synced Desktop folder, OneDrive version history preserves old values after rotation; B5-01 HIGH operator Supabase account without MFA (is_operator() is the single gate); B3-04 HIGH-likelihood silent fulfillment failure (webhook miss + cron never observed + Vercel Hobby 1-hour log retention); B3-05 MEDIUM refund-after-payout commission chain (15-min commission hold does no work since manual approval is the real gate → change to 7 days in release_commissions + request_withdrawal, schema.sql:611-616/828); B1-02 MEDIUM XSS→payout-hijack chain (update_own_profile has NO server-side bank/UPI format validation).

**Cheap wins ranked:** MFA (10min, user), move secrets out of OneDrive + purge history + rotate 4 keys (30min, user), 7-day commission hold (5min, code), REVOKE blanket anon/authenticated table grants re-grant 3 needs (30min, code — anon+authenticated currently hold ALL privileges incl. TRUNCATE on all 8 base tables; RLS is the only gate; PostgREST can't express TRUNCATE so inert today), uptime monitor + weekly Dodo reconcile ritual (user), drop unsafe-eval from CSP (code), webhook timestamp staleness (code), approval checklist: reject contact_info containing URLs/UPI/payment text (user process).

**VERIFIED FACTS:** RLS live-probes hold (anon 0 rows everywhere, public_jobs 401 anon); all app RPCs security_definer + pinned search_path; public_jobs = owner-rights VIEW (not security_invoker) exposing only approved+unexpired+non-stale, contact_info excluded — the deliberate RLS bypass; payment chain solid (price pin fail-closed, expectedAmount==total_amount, idempotent process_payment, service_role-only grants); Vercel project name = `portfolio`; Hobby log retention ~1h so cron execution never observed; production idle-healthy (0 5xx/4xx); 6 profiles, 76 approved jobs, 1 purchase.

**MEMORY CORRECTIONS:** @reticlehq/* are GONE from package.json (stale claims in [[project-dependency-upgrade-plan]] era + my flaw list #8 wrong); `jobkar:recent-searches` holds user-typed strings (not just job ids); Razorpay fully dead except 3 stale comments in schema.sql; gh CLI NOT installed (pushes = plain git); Vercel CLI authenticated (devansh04b-4705) but first call may EPIPE (retry once).

**ACCEPTED RISKS (stop worrying):** in-memory rate limiter, client checkout_url nav, http: in safeExternalUrl, ?next= (double-guarded), no Permissions-Policy/COOP/COEP, verify-payment+settings unrated, referral brute force (36^8), multi-account farming (economics self-defeating: pays 75-80% net + ₹500 threshold strands funds), PostgREST no-TRUNCATE, plaintext bank/PAN at rest (6 users), partial refunds merchant-only, webhook replay (idempotent), Hobby DoS economics (suspends, doesn't bill).
