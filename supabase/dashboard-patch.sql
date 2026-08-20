-- ═══════════════════════════════════════════════════════════════════
-- Jobkar — dashboard split MIGRATION (run ONCE on the existing live DB).
-- Applies the v10 deltas to a database already created from the pre-split
-- schema.sql, without dropping data.
--
-- If you are creating a FRESH database, skip this file — run schema.sql
-- then seed.sql instead.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Widen profiles.role and demote any legacy admin/agent accounts.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('jobseeker', 'operator'));

update public.profiles set role = 'jobseeker' where role in ('admin', 'agent');

-- 2. job_listings: apply_url + stale_at + check.
alter table public.job_listings add column if not exists apply_url text;
alter table public.job_listings add column if not exists stale_at timestamptz;
alter table public.job_listings drop constraint if exists job_listings_apply_url_check;
alter table public.job_listings add constraint job_listings_apply_url_check
  check (apply_url is null or (apply_url ~* '^https?://' and char_length(apply_url) <= 2048));

create unique index if not exists job_listings_source_pending_idx
  on public.job_listings (source_link)
  where source_link is not null and status = 'pending_review';

-- 3. withdrawal_requests: 'reversed' status + attribution columns.
alter table public.withdrawal_requests drop constraint if exists withdrawal_requests_status_check;
alter table public.withdrawal_requests add constraint withdrawal_requests_status_check
  check (status in ('pending', 'approved', 'rejected', 'reversed'));
alter table public.withdrawal_requests add column if not exists processed_by uuid references public.profiles(id);
alter table public.withdrawal_requests add column if not exists reversed_at timestamptz;
alter table public.withdrawal_requests add column if not exists reversed_by uuid references public.profiles(id);

-- 4. jobs_version sentinel.
create table if not exists public.jobs_version (
  id int primary key default 1 check (id = 1),
  version bigint not null default 0
);
insert into public.jobs_version (id, version) values (1, 0) on conflict (id) do nothing;
alter table public.jobs_version enable row level security;
drop policy if exists "jobs_version public read" on public.jobs_version;
create policy "jobs_version public read" on public.jobs_version for select using (true);

-- 5. is_operator helper (drop dead is_agent/is_admin + their policies).
drop function if exists public.is_agent();
create or replace function public.is_operator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'operator');
$$;

drop policy if exists "profiles admin all" on public.profiles;
drop policy if exists "jobs agents read own" on public.job_listings;
drop policy if exists "jobs agents insert own" on public.job_listings;
drop policy if exists "jobs admin all" on public.job_listings;
drop policy if exists "purchases admin all" on public.premium_purchases;
drop policy if exists "withdrawals admin all" on public.withdrawal_requests;
drop policy if exists "settings admin all" on public.site_settings;

-- 6. Operator SELECT policies.
drop policy if exists "jobs operator read" on public.job_listings;
create policy "jobs operator read" on public.job_listings
  for select using (public.is_operator());

drop policy if exists "purchases operator read" on public.premium_purchases;
create policy "purchases operator read" on public.premium_purchases
  for select using (public.is_operator());

drop policy if exists "withdrawals operator read" on public.withdrawal_requests;
create policy "withdrawals operator read" on public.withdrawal_requests
  for select using (public.is_operator());

-- 7. operator_profiles view (column gate; no bank_*).
create or replace view public.operator_profiles as
select id, email, full_name, role, referral_code, premium_plan, premium_expires_at, created_at
from public.profiles
where public.is_operator();
grant select on public.operator_profiles to authenticated;

-- 8. public_jobs view: apply_url + stale exclusion.
create or replace view public.public_jobs as
select id, title, company, location, salary_range, experience, description,
       tags, is_premium, is_featured, featured_until, expires_at,
       source_link, apply_url, created_at, approved_at
from public.job_listings
where status = 'approved'
  and (expires_at is null or expires_at > now())
  and stale_at is null;
grant select on public.public_jobs to anon, authenticated;

-- 9. Moderation + live-sync triggers.
create or replace function public.job_listings_insert_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('jobkar.bypass', true), '') <> 't' then
    new.status := 'pending_review';
    new.is_premium := false;
    new.is_featured := false;
    new.featured_until := null;
    new.approved_at := null;
    new.approved_by := null;
    new.stale_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists job_listings_insert_guard on public.job_listings;
create trigger job_listings_insert_guard
  before insert on public.job_listings
  for each row execute procedure public.job_listings_insert_guard();

create or replace function public.job_listings_update_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('jobkar.bypass', true), '') <> 't' then
    if new.status is distinct from old.status
       or new.is_premium is distinct from old.is_premium
       or new.is_featured is distinct from old.is_featured
       or new.featured_until is distinct from old.featured_until
       or new.approved_at is distinct from old.approved_at
       or new.approved_by is distinct from old.approved_by then
      raise exception 'moderation fields require an approved RPC';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists job_listings_update_guard on public.job_listings;
create trigger job_listings_update_guard
  before update on public.job_listings
  for each row execute procedure public.job_listings_update_guard();

create or replace function public.bump_jobs_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.jobs_version (id, version) values (1, 1)
  on conflict (id) do update set version = public.jobs_version.version + 1;
  return null;
end;
$$;
drop trigger if exists job_listings_version_bump on public.job_listings;
create trigger job_listings_version_bump
  after insert or update or delete on public.job_listings
  for each row execute procedure public.bump_jobs_version();

-- 10. Re-gate approve_withdrawal (is_admin → is_operator) + stamp processed_by.
create or replace function public.approve_withdrawal(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  w public.withdrawal_requests%rowtype;
  v_left numeric;
  r record;
  v_take numeric;
begin
  if not public.is_operator() then raise exception 'forbidden'; end if;

  select * into w from public.withdrawal_requests where id = p_id for update;
  if w.id is null then raise exception 'withdrawal not found'; end if;
  if w.status <> 'pending' then return jsonb_build_object('status', 'already_' || w.status); end if;

  perform 1 from public.premium_purchases where referrer_user_id = w.user_id for update;

  select sum(commission_amount - withdrawn_amount) into v_left
  from public.premium_purchases
  where referrer_user_id = w.user_id
    and (commission_status = 'available'
      or (commission_status = 'pending' and created_at <= now() - interval '15 minutes'))
    and commission_amount > withdrawn_amount;
  v_left := coalesce(v_left, 0);

  if w.amount > v_left + 0.001 then
    raise exception 'insufficient available commission: withdrawal %, available %', w.amount, v_left;
  end if;

  v_left := w.amount;
  for r in
    select id, (commission_amount - withdrawn_amount) as remaining
    from public.premium_purchases
    where referrer_user_id = w.user_id
      and (commission_status = 'available'
        or (commission_status = 'pending' and created_at <= now() - interval '15 minutes'))
      and commission_amount > withdrawn_amount
    order by created_at
  loop
    exit when v_left <= 0.001;
    v_take := least(r.remaining, v_left);
    update public.premium_purchases
    set withdrawn_amount = withdrawn_amount + v_take,
        commission_status = case
          when withdrawn_amount + v_take >= commission_amount then 'withdrawn'
          else 'available' end
    where id = r.id and commission_amount > withdrawn_amount;
    if not found then raise exception 'commission ledger changed concurrently'; end if;
    v_left := v_left - v_take;
  end loop;

  if v_left > 0.001 then raise exception 'could not fully consume the commission ledger'; end if;

  update public.withdrawal_requests
  set status = 'approved', processed_at = now(), processed_by = auth.uid()
  where id = p_id;

  return jsonb_build_object('status', 'approved');
end;
$$;

-- 11. New operator RPCs (reject/reverse withdrawal, job moderation, settings).
create or replace function public.reject_withdrawal(p_id uuid, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  w public.withdrawal_requests%rowtype;
begin
  if not public.is_operator() then raise exception 'forbidden'; end if;
  if p_note is null or length(trim(p_note)) < 3 then raise exception 'note required'; end if;
  select * into w from public.withdrawal_requests where id = p_id for update;
  if w.id is null then raise exception 'withdrawal not found'; end if;
  if w.status <> 'pending' then return jsonb_build_object('status', 'already_' || w.status); end if;
  update public.withdrawal_requests
  set status = 'rejected', admin_notes = left(p_note, 1000),
      processed_at = now(), processed_by = auth.uid()
  where id = p_id;
  return jsonb_build_object('status', 'rejected');
end;
$$;

create or replace function public.reverse_withdrawal(p_id uuid, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  w public.withdrawal_requests%rowtype;
  v_left numeric;
  r record;
  v_take numeric;
begin
  if not public.is_operator() then raise exception 'forbidden'; end if;
  if p_note is null or length(trim(p_note)) < 3 then raise exception 'note required'; end if;
  select * into w from public.withdrawal_requests where id = p_id for update;
  if w.id is null then raise exception 'withdrawal not found'; end if;
  if w.status <> 'approved' then return jsonb_build_object('status', 'already_' || w.status); end if;
  if w.processed_at is null or w.processed_at < now() - interval '15 minutes' then
    raise exception 'reversal window expired';
  end if;

  perform 1 from public.premium_purchases where referrer_user_id = w.user_id for update;

  v_left := w.amount;
  for r in
    select id, withdrawn_amount
    from public.premium_purchases
    where referrer_user_id = w.user_id and withdrawn_amount > 0
      and commission_status <> 'voided'
      and refunded_at is null
    order by created_at desc
  loop
    exit when v_left <= 0.001;
    v_take := least(r.withdrawn_amount, v_left);
    update public.premium_purchases
    set withdrawn_amount = withdrawn_amount - v_take, commission_status = 'available'
    where id = r.id;
    v_left := v_left - v_take;
  end loop;
  if v_left > 0.001 then raise exception 'could not restore the commission ledger'; end if;

  update public.withdrawal_requests
  set status = 'reversed', admin_notes = left(p_note, 1000),
      reversed_at = now(), reversed_by = auth.uid()
  where id = p_id;
  return jsonb_build_object('status', 'reversed');
end;
$$;

create or replace function public.submit_job(
  p_title text, p_company text, p_location text, p_salary_range text,
  p_experience text, p_description text, p_tags text[],
  p_contact_info text, p_source_link text, p_apply_url text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_expires timestamptz;
begin
  if not public.is_operator() then raise exception 'forbidden'; end if;
  select now() + make_interval(days => s.job_ttl_days) into v_expires
  from public.site_settings s where id = 1;
  insert into public.job_listings (
    agent_id, source_link, apply_url, title, company, location, salary_range,
    experience, description, contact_info, tags,
    is_premium, is_featured, featured_until, expires_at, status, approved_at, approved_by
  ) values (
    null, nullif(p_source_link, ''), nullif(p_apply_url, ''),
    p_title, p_company, nullif(p_location, ''), nullif(p_salary_range, ''),
    nullif(p_experience, ''), nullif(p_description, ''), nullif(p_contact_info, ''),
    coalesce(p_tags, '{}'), false, false, null, v_expires, 'pending_review', null, null
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.approve_job(p_id uuid, p_is_premium boolean, p_is_featured boolean, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s public.site_settings%rowtype;
begin
  if not public.is_operator() then raise exception 'forbidden'; end if;
  select * into s from public.site_settings where id = 1;
  perform set_config('jobkar.bypass', 't', true);
  update public.job_listings
  set status = 'approved', is_premium = coalesce(p_is_premium, false), is_featured = coalesce(p_is_featured, false),
      featured_until = case when coalesce(p_is_featured, false) then now() + make_interval(days => s.featured_days) else null end,
      expires_at = now() + make_interval(days => s.job_ttl_days), stale_at = null,
      approved_at = now(), approved_by = auth.uid(), admin_notes = nullif(p_note, '')
  where id = p_id and status = 'pending_review';
  if not found then return jsonb_build_object('status', 'not_found_or_not_pending'); end if;
  return jsonb_build_object('status', 'approved');
end;
$$;

create or replace function public.reject_job(p_id uuid, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_operator() then raise exception 'forbidden'; end if;
  if p_note is null or length(trim(p_note)) < 3 then raise exception 'note required'; end if;
  perform set_config('jobkar.bypass', 't', true);
  update public.job_listings set status = 'rejected', admin_notes = left(p_note, 1000)
  where id = p_id and status = 'pending_review';
  if not found then return jsonb_build_object('status', 'not_found_or_not_pending'); end if;
  return jsonb_build_object('status', 'rejected');
end;
$$;

create or replace function public.renew_job(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s public.site_settings%rowtype;
begin
  if not public.is_operator() then raise exception 'forbidden'; end if;
  select * into s from public.site_settings where id = 1;
  perform set_config('jobkar.bypass', 't', true);
  update public.job_listings set expires_at = now() + make_interval(days => s.job_ttl_days), stale_at = null
  where id = p_id and status = 'approved';
  if not found then return jsonb_build_object('status', 'not_found_or_not_approved'); end if;
  return jsonb_build_object('status', 'renewed');
end;
$$;

create or replace function public.set_job_stale(p_id uuid, p_stale boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_operator() then raise exception 'forbidden'; end if;
  perform set_config('jobkar.bypass', 't', true);
  update public.job_listings set stale_at = case when p_stale then now() else null end where id = p_id;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function public.update_site_settings_desktop(
  p_price_weekly int, p_price_monthly int, p_price_quarterly int, p_price_annual int,
  p_commission_tiers jsonb, p_job_ttl_days int, p_featured_days int
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_operator() then raise exception 'forbidden'; end if;
  update public.site_settings
  set price_weekly = p_price_weekly, price_monthly = p_price_monthly,
      price_quarterly = p_price_quarterly, price_annual = p_price_annual,
      commission_tiers = p_commission_tiers, job_ttl_days = p_job_ttl_days,
      featured_days = p_featured_days, updated_at = now()
  where id = 1;
end;
$$;

-- 12. Revoke the legacy update_site_settings (is_admin-gated, reaches threshold).
drop function if exists public.update_site_settings(int, int, int, int, jsonb, numeric, int, int);

-- 13. Permissions: money RPCs service-role ONLY; operators via authenticated+gate.
revoke execute on function public.process_payment(uuid, text, numeric, text, text, text) from public;
revoke execute on function public.release_commissions() from public;
revoke execute on function public.void_commission(text, numeric) from public;
grant  execute on function public.process_payment(uuid, text, numeric, text, text, text) to service_role;
grant  execute on function public.release_commissions() to service_role;
grant  execute on function public.void_commission(text, numeric) to service_role;

grant execute on function public.update_own_profile(text, text, text) to authenticated;
grant execute on function public.request_withdrawal(numeric) to authenticated;
grant execute on function public.approve_withdrawal(uuid) to authenticated;
grant execute on function public.reject_withdrawal(uuid, text) to authenticated;
grant execute on function public.reverse_withdrawal(uuid, text) to authenticated;
grant execute on function public.submit_job(text, text, text, text, text, text, text[], text, text, text) to authenticated;
grant execute on function public.approve_job(uuid, boolean, boolean, text) to authenticated;
grant execute on function public.reject_job(uuid, text) to authenticated;
grant execute on function public.renew_job(uuid) to authenticated;
grant execute on function public.set_job_stale(uuid, boolean) to authenticated;
grant execute on function public.update_site_settings_desktop(int, int, int, int, jsonb, int, int) to authenticated;

-- 14. Realtime publication for jobs_version.
alter publication supabase_realtime add table public.jobs_version;

-- ═══════════════════════════════════════════════════════════════════
-- AFTER running this, create the operator accounts:
--   1. Supabase → Authentication → Users → Add user (owner@…, friend@…).
--   2. Run: update public.profiles set role='operator' where email='…';
-- The desktop app logs in with those email/password credentials.
-- ═══════════════════════════════════════════════════════════════════
