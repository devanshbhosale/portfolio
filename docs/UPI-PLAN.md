# UPI Payout Option — Execution Plan

> Status snapshot saved 2026-09-08. The UPI feature is **code-complete in
> BOTH repos, all gates green, but UNCOMMITTED and NOT deployed**. Preship
> review ran (code-review-preshipment agent): verdict **DO NOT SHIP** with
> 2 SQL blockers + 2 should-fixes — the exact fixes are listed below and once
> applied the reviewer's verdict flips to SHIP WITH FIXES. This file is the
> execution list for a fresh session: apply fixes 1–5, then run the
> load-bearing deploy order in step 2. Do NOT re-run a full preship — the
> reviewer already prescribed these exact fixes; just self-check the two SQL
> files against this doc.

## What the feature does (built, pending deploy)

Users can save a UPI ID as an alternative payout rail; withdrawal requests
carry a payout-method snapshot (`payout_method` + `upi_id`) so the operator
pays the right thing. ₹500 minimum unchanged and still enforced server-side.
Design: `profiles.upi_id` (13th safe column, column-granted), `set_own_upi`
RPC (separate function — schema rule: never overload `update_own_profile`),
`request_withdrawal(p_amount, p_method default 'bank')`.

## State at save time

- Website repo (`jobkar`) — 13 modified/new files, ALL UNCOMMITTED:
  `supabase/live-fixes/2026-09-08-upi-payouts.sql` (new; header comment
  already corrected), `supabase/schema.sql`, `lib/database.types.ts`,
  `lib/validation.ts`, `app/api/withdrawals/route.ts`,
  `contexts/AuthContext.tsx`, `components/UpiConnectModal.tsx` (new),
  `components/WithdrawalModal.tsx`, `app/dashboard/page.tsx`,
  `app/privacy/page.tsx`, `scripts/smoke.mjs`, `test/validation.test.ts`,
  `test/authUserMapping.test.ts`
- Dashboard repo (`../jobkar-dashboard`) — 2 files UNCOMMITTED:
  `shared/db.ts`, `src/pages/tabs/WithdrawalsTab.tsx`
- Gates at save time: website tsc clean / lint clean / vitest **110/110**;
  dashboard typecheck:web + typecheck:node clean / vitest **83/83**
- Live DB: **migration NOT applied**. Prod runs `d8152c6` (pre-UPI).
- Live site is currently code `8462e32`-era for withdrawals: calls
  `request_withdrawal` with only `{p_amount}`.

## Step 0 — Fresh-session state check

1. `git status` both repos — expect exactly the files above, nothing else.
2. `npx vitest run` in website (110) + dashboard (83) — sanity.

## Step 1 — Apply the review fixes (BEFORE anything ships)

**FIX 1 (BLOCKER — live-fixes SQL):** in
`supabase/live-fixes/2026-09-08-upi-payouts.sql`, add immediately BEFORE
the `create or replace function public.request_withdrawal` line:

```sql
-- Old 1-arg overload must go: PostgREST resolves {p_amount} against BOTH
-- overloads (omitted optional arg still matches) → AmbiguousRpc HTTP 300
-- on the OLD live bundle. Same reason the compliance pass dropped the
-- 3-arg update_own_profile.
drop function if exists public.request_withdrawal(numeric);
```

Without this, applying the migration instantly breaks every live withdrawal
POST until the new site deploys.

**FIX 2 (BLOCKER — schema.sql grants block, ~line 1280):** replace

```sql
revoke execute on function public.request_withdrawal(numeric) from public, anon;
grant execute on function public.request_withdrawal(numeric) to authenticated;
```

with

```sql
revoke execute on function public.set_own_upi(text) from public, anon;
grant  execute on function public.set_own_upi(text) to authenticated;
revoke execute on function public.request_withdrawal(numeric, text) from public, anon;
grant  execute on function public.request_withdrawal(numeric, text) to authenticated;
```

(As-is, a fresh schema.sql run aborts at the stale `(numeric)` REVOKE and
leaves the 2-arg money RPC executable by anon. Live-fixes file already has
the correct block — this just removes the drift.)

**FIX 3 (should-fix — WithdrawalModal stale default):** the modal is always
mounted, so `useState(defaultMethod)` initializes once per page load; a
user who adds UPI mid-session gets a stale preselect. In
`components/WithdrawalModal.tsx` add `useEffect` (import it from 'react'):

```ts
useEffect(() => { if (isOpen) setMethod(defaultMethod) }, [isOpen, defaultMethod])
```

**FIX 4 (honest copy — trust-rule):** payouts are sent manually by the
operator, so don't advertise "instant". Replace:
- `components/WithdrawalModal.tsx`: `'UPI (instant)'` → `'UPI'`
- `components/UpiConnectModal.tsx`: "Get referral payouts sent straight to
  your UPI — usually within minutes of approval." → "Get referral payouts
  sent straight to your UPI ID."
- `app/dashboard/page.tsx`: the "we pay UPI withdrawals first" sentence →
  end it at "Add a UPI ID." (keep the link/button behavior).

**FIX 5 (nits, dashboard repo):** `WithdrawalsTab.tsx` column header
`Bank` → `Payout`; Eye-button title "Full bank details" → "Full payout
details". Optional: `shared/db.ts:10` comment "schema.sql (v10)" → bump.

Then re-run gates: website `npx tsc --noEmit && npx next lint && npx vitest
run` (expect 110); dashboard `npm run typecheck:web && npm run
typecheck:node && npx vitest run` (expect 83).

## Step 2 — The load-bearing deploy order (DO NOT reorder)

1. Commit website (`feat: UPI payout option …`) and dashboard repo.
2. **Apply the migration to live DB** (AFTER FIX 1):
   `node ~/.zcode/tmp/sq.mjs --file supabase/live-fixes/2026-09-08-upi-payouts.sql`
3. Verify old-bundle safety + the migration:
   - REST: call `request_withdrawal` with body `{"p_amount": 1}` using a
     Test Buyer JWT — the error must be "minimum withdrawal is 500" (or
     balance), NOT a PGRST203 ambiguous-function error. That proves the
     1-arg drop worked.
   - SQL: `select has_table_privilege('anon','public.set_own_upi(text)','EXECUTE')`
     = false; `proname` count for request_withdrawal = exactly ONE (2-arg);
     `information_schema.column_privileges` for authenticated on profiles =
     13 columns incl. `upi_id`.
4. Build the operator dashboard (`npm run build` in ../jobkar-dashboard) so
   the new WithdrawalsTab is what's in use before any UPI request arrives.
5. `git push origin main` (website) → wait for Vercel deploy.
   (Order matters both ways: site-before-migration = AuthContext's `upi_id`
   select fails → mass logout; migration-before-site without FIX 1 = live
   withdrawal POSTs 300.)

## Step 3 — Browser E2E with Test Buyer (e2e.buyer.test@gmail.com / JobkarE2E!2026)

1. Chrome (`cmd //c start chrome.exe --new-window`, drive via a11y — see
   memory `reference-chrome-automation`): dashboard → Add UPI ID → save
   `e2ebuyer@upi` → toast + dashboard shows "UPI: e2ebuyer@upi".
2. Server-side: `select upi_id from public.profiles where email='e2e.buyer.test@gmail.com'`
   = `e2ebuyer@upi` (lowercase).
3. Full request path needs balance (Test Buyer has ₹0). Seed one fake
   commission, request ₹500 UPI withdrawal, verify, then clean up:
   - Seed: insert into `premium_purchases` (grab the exact column list from
     `lib/database.types.ts` / schema first; status 'available', commission
     60000 paise-equivalent per that table's units, referrer_user_id = Test
     Buyer id, plus whatever NOT NULL columns require — inspect one existing
     row first and mirror it).
   - Browser: Request Withdrawal → ₹500 → method UPI (radio appears; bank
     also connected for this account) → submit.
   - Verify row: `select payout_method, upi_id, bank_holder_name, amount,
     status from public.withdrawal_requests order by created_at desc limit 1`
     → payout_method 'upi', upi_id 'e2ebuyer@upi', bank cols '', status pending.
   - Verify GET /api/withdrawals (browser JWT / cookie) contains
     payout_method 'upi' and NO upi_id/bank fields (route serves the safe
     columns only — the test suite asserts this too).
   - Cleanup: delete that withdrawal_requests row + the seeded
     premium_purchases row. Leave the UPI ID on the profile (harmless, or
     clear via set_own_upi(null)).
4. Bank path regression: with the seeded balance gone, request a bank
   withdrawal is impossible — instead just confirm the old masked display
   `•••• 9012` still shows and the dashboard renders both rails.

## Step 4 — Smoke + close-out

1. `set -a && source .env.local && set +a && node scripts/smoke.mjs` — all
   pass, now including the new `/privacy` "UPI ID" needle (24 checks).
2. Memory: update `jobkar-legal-compliance-audit.md` (or add a short new
   memory) — UPI rail live, the **PostgREST overload gotcha** (create or
   replace with a new arg list NEVER drops the old signature; always
   `drop function` the old one — second occurrence after the 3-arg
   update_own_profile), and the two-sided deploy order. Refresh MEMORY.md
   hook line.

## Guardrails

- Preship already done for this tree (DO NOT SHIP → fixes 1–2 flip it).
  If step 0 shows files beyond the list above, re-run preship before step 2.
- SQL via the Management API helper only; never hand back a manual runbook.
- No Razorpay LIVE / credential work anywhere here.
