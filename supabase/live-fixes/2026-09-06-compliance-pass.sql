-- Applied to the live DB via the Management API helper on 2026-09-06
-- (migration `compliance-pass`). Mirrored into supabase/schema.sql.
--
-- Compliance build (docs/COMPLIANCE-PLAN.md): consent record, PAN at
-- bank-connect, bank_last4 for a real mask, and the reports table that
-- powers the report-this-listing / takedown pipeline.
--
-- NOTE: this file is additive-only. The column-level grants that stop
-- browsers reading raw bank columns live in 2026-09-06-bank-column-grants.sql
-- and are applied LAST, after the explicit-column-list code is deployed.

-- 1. profiles: PAN (TDS-ready the day a referrer nears the threshold),
--    consent timestamp (signup checkbox), last-4 for the real dashboard mask.
alter table public.profiles
  add column if not exists pan_number text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists bank_last4 text;

alter table public.profiles
  add constraint profiles_pan_number_check check (pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]$');

-- 2. Consent is recorded at account creation: the signup checkbox posts
--    terms_accepted: true in the signUp metadata, and the signup trigger
--    stamps it. This works even when email confirmation means there is no
--    session at signup time, and never touches bank fields.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  v_code := 'JK-' || upper(substr(replace(new.id::text, '-', ''), 1, 8));
  while exists (select 1 from public.profiles where referral_code = v_code) loop
    v_code := 'JK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end loop;
  insert into public.profiles (id, email, full_name, referral_code, terms_accepted_at)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', v_code,
          case when coalesce(new.raw_user_meta_data->>'terms_accepted', '') = 'true' then now() else null end);
  return new;
end;
$$;

-- 3. update_own_profile: also records PAN + last4. One overload only — the
--    legacy 3-arg version was dropped so PostgREST can never hit ambiguity.
--    PAN uses coalesce so a stale 3-arg call (old bundle / rollback) can
--    never wipe a stored PAN.
drop function if exists public.update_own_profile(text, text, text);
create or replace function public.update_own_profile(
  p_holder text, p_account text, p_ifsc text, p_pan text default null
) returns void language sql security definer set search_path = public as $$
  update public.profiles
  set bank_holder_name = p_holder,
      bank_account_number = p_account,
      bank_ifsc = upper(p_ifsc),
      bank_last4 = right(p_account, 4),
      pan_number = coalesce(upper(p_pan), pan_number),
      bank_connected_at = now()
  where id = auth.uid();
$$;

revoke execute on function public.update_own_profile(text, text, text, text) from public, anon;
grant  execute on function public.update_own_profile(text, text, text, text) to authenticated;

-- 3b. Backfill last4 for pre-migration bank connections (covers the window
--     between this migration and the deploy of the bankLast4-aware UI).
update public.profiles
set bank_last4 = right(bank_account_number, 4)
where bank_account_number is not null and bank_last4 is null;

-- 4. reports: users insert their own (RLS insert-own, job_marks precedent);
--    operators read for triage. Reporters never read back.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.job_listings(id) on delete cascade,
  reason text not null check (reason in ('fake_scam', 'expired', 'asks_for_money', 'discriminatory', 'other')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create index if not exists reports_job_id_idx on public.reports (job_id);
create index if not exists reports_user_id_idx on public.reports (user_id);

drop policy if exists "reports insert own" on public.reports;
create policy "reports insert own" on public.reports
  for insert with check (user_id = auth.uid());

drop policy if exists "reports operator read" on public.reports;
create policy "reports operator read" on public.reports
  for select using (public.is_operator());

grant select, insert on public.reports to authenticated;

-- Supabase's default privileges granted anon everything on the new table;
-- only authenticated may touch it (signed-out users get the mailto fallback).
revoke all on public.reports from anon;
