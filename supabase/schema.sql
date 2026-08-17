-- ═══════════════════════════════════════════════════════════════════
-- Jobkar — Supabase schema
-- Run this ONCE in Supabase → SQL Editor → New query.
-- Then run seed.sql.
-- ═══════════════════════════════════════════════════════════════════

-- ─── Tables ─────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'jobseeker'
    check (role in ('jobseeker', 'agent', 'admin')),
  referral_code text unique not null,
  premium_plan text check (premium_plan in ('Weekly', 'Monthly', 'Quarterly', 'Annual')),
  premium_expires_at timestamptz,           -- premium = premium_expires_at > now()
  bank_holder_name text,
  bank_account_number text,
  bank_ifsc text,
  bank_connected_at timestamptz,
  created_at timestamptz default now()
);

create table public.job_listings (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.profiles(id) on delete set null,
  source_link text,
  title text not null,
  company text not null,
  location text,
  salary_range text,
  experience text,
  description text,
  contact_info text,                        -- HR contact; only served to valid premium members
  tags text[] default '{}',
  is_premium boolean default false,
  is_featured boolean default false,
  featured_until timestamptz,
  expires_at timestamptz,                   -- job TTL; null = never expires
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id)
);

create table public.premium_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  plan text not null check (plan in ('Weekly', 'Monthly', 'Quarterly', 'Annual')),
  amount numeric not null check (amount >= 0),          -- rupees
  payment_id text unique not null,                      -- Razorpay idempotency anchor
  order_id text,
  referral_code_used text,
  referrer_user_id uuid references public.profiles(id),
  commission_amount numeric not null default 0 check (commission_amount >= 0),
  withdrawn_amount numeric not null default 0 check (withdrawn_amount >= 0),
  commission_status text not null default 'none'
    check (commission_status in ('none', 'pending', 'available', 'withdrawn', 'voided')),
  created_at timestamptz default now()
);

create table public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  amount numeric not null check (amount > 0),           -- rupees
  bank_holder_name text not null,
  bank_account_number text not null,
  bank_ifsc text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz default now(),
  processed_at timestamptz
);

-- Single-row site configuration, editable from the admin dashboard.
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  price_weekly int not null default 9900,      -- paise
  price_monthly int not null default 19900,
  price_quarterly int not null default 49900,
  price_annual int not null default 149900,
  commission_tiers jsonb not null default '{"Weekly":0.2,"Monthly":0.2,"Quarterly":0.25,"Annual":0.25}',
  withdraw_threshold numeric not null default 500,  -- rupees
  job_ttl_days int not null default 30,
  featured_days int not null default 7,
  updated_at timestamptz default now()
);

create index on public.job_listings (status, approved_at desc);
create index on public.job_listings (agent_id);
create index on public.premium_purchases (user_id);
create index on public.premium_purchases (referrer_user_id);
create index on public.withdrawal_requests (user_id, status);

-- ─── Row Level Security ─────────────────────────────────────────────

alter table public.profiles          enable row level security;
alter table public.job_listings      enable row level security;
alter table public.premium_purchases enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.site_settings     enable row level security;

-- Role helpers (security definer so policies can read profiles).
create or replace function public.is_agent()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'agent');
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- profiles
create policy "profiles read own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles admin all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());
-- No update-own policy: bank details change only via update_own_profile RPC.

-- job_listings
create policy "jobs public read approved" on public.job_listings
  for select using (status = 'approved' and (expires_at is null or expires_at > now()));
create policy "jobs agents read own" on public.job_listings
  for select using (public.is_agent() and agent_id = auth.uid());
create policy "jobs agents insert own" on public.job_listings
  for insert with check (public.is_agent() and agent_id = auth.uid());
create policy "jobs admin all" on public.job_listings
  for all using (public.is_admin()) with check (public.is_admin());

-- premium_purchases
create policy "purchases read own" on public.premium_purchases
  for select using (user_id = auth.uid() or referrer_user_id = auth.uid());
create policy "purchases admin all" on public.premium_purchases
  for all using (public.is_admin()) with check (public.is_admin());
-- No anon insert: purchases are written only by process_payment (service role).

-- withdrawal_requests
create policy "withdrawals read own" on public.withdrawal_requests
  for select using (user_id = auth.uid());
create policy "withdrawals admin all" on public.withdrawal_requests
  for all using (public.is_admin()) with check (public.is_admin());
-- No anon insert: withdrawals go through /api/withdrawals which validates the balance.

-- site_settings
create policy "settings public read" on public.site_settings
  for select using (true);
create policy "settings admin all" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ─── Public jobs view (column-level gate) ───────────────────────────
-- Exposes only safe columns of approved, unexpired jobs. contact_info,
-- admin_notes, agent_id, approved_by are NEVER in this view.
create or replace view public.public_jobs as
select id, title, company, location, salary_range, experience, description,
       tags, is_premium, is_featured, featured_until, expires_at,
       source_link, created_at, approved_at
from public.job_listings
where status = 'approved' and (expires_at is null or expires_at > now());

grant select on public.public_jobs to anon, authenticated;

-- ─── Signup trigger ─────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  v_code := 'JK-' || upper(substr(replace(new.id::text, '-', ''), 1, 8));
  -- Collision retry: append random chars until unique (rare, but cheap insurance).
  while exists (select 1 from public.profiles where referral_code = v_code) loop
    v_code := 'JK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end loop;
  insert into public.profiles (id, email, full_name, referral_code)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', v_code);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Money RPCs (all transactional) ─────────────────────────────────

-- Called by the Razorpay webhook with the service-role key.
-- Idempotent on payment_id. Verifies amount against site_settings prices.
-- Extends premium from max(current expiry, now). Pays tiered referral
-- commission (never to self).
create or replace function public.process_payment(
  p_user_id uuid,
  p_plan text,
  p_amount numeric,
  p_payment_id text,
  p_order_id text,
  p_referral_code text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s public.site_settings%rowtype;
  v_expected numeric;
  v_days int;
  v_referrer public.profiles%rowtype;
  v_tier numeric;
begin
  if exists (select 1 from public.premium_purchases where payment_id = p_payment_id) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  select * into s from public.site_settings where id = 1;
  v_days := case p_plan
    when 'Weekly' then 7 when 'Monthly' then 30
    when 'Quarterly' then 90 when 'Annual' then 365 else null end;
  v_expected := case p_plan
    when 'Weekly' then s.price_weekly when 'Monthly' then s.price_monthly
    when 'Quarterly' then s.price_quarterly when 'Annual' then s.price_annual end / 100.0;
  if v_days is null then
    raise exception 'invalid plan: %', p_plan;
  end if;
  if abs(p_amount - v_expected) > 0.01 then
    raise exception 'amount mismatch: got % expected %', p_amount, v_expected;
  end if;

  insert into public.premium_purchases (user_id, plan, amount, payment_id, order_id, referral_code_used)
  values (p_user_id, p_plan, p_amount, p_payment_id, p_order_id, nullif(p_referral_code, ''));

  update public.profiles
  set premium_plan = p_plan,
      premium_expires_at = greatest(coalesce(premium_expires_at, now()), now()) + make_interval(days => v_days)
  where id = p_user_id;

  if nullif(p_referral_code, '') is not null then
    select * into v_referrer from public.profiles
    where referral_code = p_referral_code and id <> p_user_id;
    if v_referrer.id is not null then
      v_tier := coalesce((s.commission_tiers ->> p_plan)::numeric, 0.2);
      update public.premium_purchases
      set referrer_user_id = v_referrer.id,
          commission_amount = round(p_amount * v_tier, 2),
          commission_status = 'pending'
      where payment_id = p_payment_id;
    end if;
  end if;

  return jsonb_build_object('status', 'inserted');
end;
$$;

-- Bank details: the ONLY profile columns a user can write themselves.
create or replace function public.update_own_profile(
  p_holder text, p_account text, p_ifsc text
) returns void language sql security definer set search_path = public as $$
  update public.profiles
  set bank_holder_name = p_holder,
      bank_account_number = p_account,
      bank_ifsc = upper(p_ifsc),
      bank_connected_at = now()
  where id = auth.uid();
$$;

-- Commission release: pending → available after the holding period.
-- Conditional WHERE makes overlapping runs safe.
create or replace function public.release_commissions()
returns int language sql security definer set search_path = public as $$
  with moved as (
    update public.premium_purchases
    set commission_status = 'available'
    where commission_status = 'pending'
      and created_at <= now() - interval '15 minutes'
    returning 1
  )
  select count(*) from moved;
$$;

-- Withdrawal approval. Admin-only. Consumes available commissions
-- oldest-first as a ledger (partial consumption supported), so a
-- withdrawal can never take more than is available.
create or replace function public.approve_withdrawal(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  w public.withdrawal_requests%rowtype;
  v_left numeric;
  r record;
  v_take numeric;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  select * into w from public.withdrawal_requests where id = p_id for update;
  if w.id is null then raise exception 'withdrawal not found'; end if;
  if w.status <> 'pending' then
    return jsonb_build_object('status', 'already_' || w.status);
  end if;

  select sum(commission_amount - withdrawn_amount) into v_left
  from public.premium_purchases
  where referrer_user_id = w.user_id
    and commission_status = 'available'
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
      and commission_status = 'available'
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
    where id = r.id;
    v_left := v_left - v_take;
  end loop;

  update public.withdrawal_requests
  set status = 'approved', processed_at = now()
  where id = p_id;

  return jsonb_build_object('status', 'approved');
end;
$$;

-- Refund handling: void the commission and revoke the premium it granted.
create or replace function public.void_commission(p_payment_id text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_purchase public.premium_purchases%rowtype;
begin
  select * into v_purchase from public.premium_purchases where payment_id = p_payment_id;
  if v_purchase.id is null then return; end if;

  update public.premium_purchases
  set commission_status = 'voided'
  where payment_id = p_payment_id and commission_status in ('pending', 'available');

  update public.profiles
  set premium_plan = null, premium_expires_at = null
  where id = v_purchase.user_id
    and premium_expires_at is not null
    and premium_expires_at <= now() + make_interval(days => case v_purchase.plan
        when 'Weekly' then 7 when 'Monthly' then 30
        when 'Quarterly' then 90 else 365 end);
end;
$$;

-- Admin-editable site settings (single row).
create or replace function public.update_site_settings(
  p_price_weekly int, p_price_monthly int, p_price_quarterly int, p_price_annual int,
  p_commission_tiers jsonb, p_withdraw_threshold numeric,
  p_job_ttl_days int, p_featured_days int
) returns void language sql security definer set search_path = public as $$
  update public.site_settings
  set price_weekly = p_price_weekly,
      price_monthly = p_price_monthly,
      price_quarterly = p_price_quarterly,
      price_annual = p_price_annual,
      commission_tiers = p_commission_tiers,
      withdraw_threshold = p_withdraw_threshold,
      job_ttl_days = p_job_ttl_days,
      featured_days = p_featured_days,
      updated_at = now()
  where id = 1 and public.is_admin();
$$;

-- ─── RPC permissions ────────────────────────────────────────────────

revoke execute on function public.process_payment(uuid, text, numeric, text, text, text) from anon, authenticated;
revoke execute on function public.release_commissions() from anon, authenticated;
revoke execute on function public.void_commission(text) from anon, authenticated;
grant  execute on function public.update_own_profile(text, text, text) to authenticated;
grant  execute on function public.approve_withdrawal(uuid) to authenticated;
grant  execute on function public.update_site_settings(int, int, int, int, jsonb, numeric, int, int) to authenticated;
-- service_role bypasses RLS; webhook/cron routes call with the service key.

-- ─── Realtime (live dashboard ↔ website sync) ──────────────────────

alter publication supabase_realtime add table public.job_listings;
alter publication supabase_realtime add table public.premium_purchases;
alter publication supabase_realtime add table public.site_settings;
