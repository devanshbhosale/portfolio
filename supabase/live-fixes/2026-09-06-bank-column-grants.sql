-- Column-level grants on public.profiles — applied to the live DB LAST,
-- only after the explicit-column-list code is deployed and smoke-passed.
-- Mirrored into supabase/schema.sql (bottom section).
--
-- RLS gates ROWS, not COLUMNS: today "profiles read own" lets a browser
-- select() the raw bank_account_number. These grants make the raw bank
-- columns (and any column not listed) unreadable by authenticated clients.
-- Service-role paths (getAuthedProfile, dashboard RPCs, operator views'
-- underlying owner) bypass grants, so payouts and review tools keep working.
--
-- Safe-column set — the exact list AuthContext selects and operator_profiles
-- exposes (security_invoker view → runs as authenticated, must stay readable):
--   id, email, full_name, role, referral_code, premium_plan,
--   premium_expires_at, bank_connected_at, bank_last4, pan_number,
--   terms_accepted_at, created_at
--
-- Becomes unreadable by browsers: bank_holder_name, bank_account_number,
-- bank_ifsc (payout ops continue through withdrawal_requests + service role).

revoke select on table public.profiles from authenticated;

grant select (
  id, email, full_name, role, referral_code, premium_plan,
  premium_expires_at, bank_connected_at, bank_last4, pan_number,
  terms_accepted_at, created_at
) on table public.profiles to authenticated;
