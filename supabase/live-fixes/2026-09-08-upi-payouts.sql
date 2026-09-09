-- UPI payout option — applied to live DB 2026-09-08.
-- Users may save a UPI ID as an alternative payout rail; withdrawal requests
-- snapshot the payout method so the operator sees exactly what to pay to.
-- Deploy order IS load-bearing, twice over:
--   1. Apply this BEFORE the new website code deploys (AuthContext selects
--      upi_id — pre-migration, that select fails and logs everyone out).
--   2. The 1-arg request_withdrawal must be DROPPED (below) or PostgREST
--      hits AmbiguousRpc on the old bundle's {p_amount} call (same reason
--      the compliance pass dropped the 3-arg update_own_profile). With the
--      drop, the old bundle resolves to the 2-arg with default 'bank'.

-- 1. profiles: the user's UPI ID (own-row readable, part of the safe column
--    grant set). Nullable: bank-only users are unaffected.
alter table public.profiles
  add column if not exists upi_id text
    check (upi_id ~ '^[a-z0-9._-]{2,}@[a-z]{2,}$');

-- 2. set_own_upi: separate RPC — schema rule forbids a second
--    update_own_profile overload (PostgREST ambiguity). p_upi null clears.
create or replace function public.set_own_upi(p_upi text default null)
returns void language sql security definer set search_path = public as $$
  update public.profiles
  set upi_id = lower(nullif(trim(p_upi), ''))
  where id = auth.uid();
$$;

revoke execute on function public.set_own_upi(text) from public, anon;
grant  execute on function public.set_own_upi(text) to authenticated;

-- 3. request_withdrawal: bank OR UPI payout; snapshot method + UPI on the
--    request row (bank fields are snapshotted as before; for UPI requests
--    they carry the stored bank values, or empty if never set).
alter table public.withdrawal_requests
  add column if not exists payout_method text not null default 'bank'
    check (payout_method in ('bank', 'upi'));
alter table public.withdrawal_requests
  alter column bank_holder_name drop not null;
alter table public.withdrawal_requests
  alter column bank_account_number drop not null;
alter table public.withdrawal_requests
  alter column bank_ifsc drop not null;
alter table public.withdrawal_requests
  add column if not exists upi_id text;

-- Old 1-arg overload must go: PostgREST resolves {p_amount} against BOTH
-- overloads (omitted optional arg still matches) → AmbiguousRpc HTTP 300
-- on the OLD live bundle. Same reason the compliance pass dropped the
-- 3-arg update_own_profile.
drop function if exists public.request_withdrawal(numeric);

create or replace function public.request_withdrawal(p_amount numeric, p_method text default 'bank')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s public.site_settings%rowtype;
  v_available numeric;
  v_pending numeric;
  v_has_bank boolean;
  v_has_upi boolean;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'enter a valid amount';
  end if;

  if p_method not in ('bank', 'upi') then
    raise exception 'invalid payout method';
  end if;

  select * into s from public.site_settings where id = 1;
  if p_amount < s.withdraw_threshold then
    raise exception 'minimum withdrawal is %', s.withdraw_threshold;
  end if;

  select (bank_holder_name is not null and bank_account_number is not null and bank_ifsc is not null),
         (upi_id is not null)
    into v_has_bank, v_has_upi
  from public.profiles where id = auth.uid();

  if p_method = 'bank' and not v_has_bank then
    raise exception 'connect your bank account first';
  end if;
  if p_method = 'upi' and not v_has_upi then
    raise exception 'add your UPI ID first';
  end if;

  perform 1 from public.premium_purchases
  where referrer_user_id = auth.uid()
  for update;

  select coalesce(sum(commission_amount - withdrawn_amount), 0) into v_available
  from public.premium_purchases
  where referrer_user_id = auth.uid()
    and (
      commission_status = 'available'
      or (commission_status = 'pending' and created_at <= now() - interval '15 minutes')
    )
    and commission_amount > withdrawn_amount;

  select coalesce(sum(amount), 0) into v_pending
  from public.withdrawal_requests
  where user_id = auth.uid() and status = 'pending';

  if p_amount > v_available - v_pending + 0.001 then
    raise exception 'insufficient balance: available %', round(v_available - v_pending, 2);
  end if;

  insert into public.withdrawal_requests
    (user_id, amount, payout_method, bank_holder_name, bank_account_number, bank_ifsc, upi_id)
  select auth.uid(), p_amount, p_method,
         coalesce(bank_holder_name, ''), coalesce(bank_account_number, ''),
         coalesce(bank_ifsc, ''), case when p_method = 'upi' then upi_id else null end
  from public.profiles where id = auth.uid();

  return jsonb_build_object('status', 'created');
end;
$$;

revoke execute on function public.request_withdrawal(numeric, text) from public, anon;
grant  execute on function public.request_withdrawal(numeric, text) to authenticated;

-- 4. Widen the column grants: upi_id is the 13th safe column (browsers read
--    their own row's UPI ID; raw bank columns stay revoked).
grant select (upi_id) on table public.profiles to authenticated;
