-- ═══════════════════════════════════════════════════════════════════
-- Jobkar — Supabase schema (v10: website + login-gated desktop dashboard)
-- Run this ONCE in Supabase → SQL Editor → New query.
-- Then run seed.sql.
--
-- Split model:
--   * Website (Vercel): jobseekers only (anon/authenticated + RLS).
--   * Desktop app (Electron, local): "operator" accounts (role='operator')
--     log in with email/password; all mutations go through security-definer
--     RPCs gated on is_operator(). No table-level write grants for operators.
-- ═══════════════════════════════════════════════════════════════════

-- ─── Tables ─────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'jobseeker'
    check (role in ('jobseeker', 'operator')),
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
  source_link text,                         -- where the job came from (attribution)
  apply_url text,                           -- the actual "apply now" destination
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
  stale_at timestamptz,                     -- set when the source posting was pulled; hidden from public
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  check (source_link is null or source_link ~* '^https?://'),
  check (apply_url is null or (apply_url ~* '^https?://' and char_length(apply_url) <= 2048))
);

-- Dedup: a source link can have at most one pending_review row; resubmission
-- after a reject is allowed (the partial predicate no longer matches).
create unique index job_listings_source_pending_idx
  on public.job_listings (source_link)
  where source_link is not null and status = 'pending_review';

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
  premium_granted_until timestamptz,                    -- expiry this payment granted (for refund attribution)
  refunded_at timestamptz,                              -- set when a full refund voids this purchase
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
    check (status in ('pending', 'approved', 'rejected', 'reversed')),
  admin_notes text,
  created_at timestamptz default now(),
  processed_at timestamptz,                             -- approved/rejected/reversed time
  processed_by uuid references public.profiles(id),     -- which operator acted
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id)
);

-- Single-row site configuration.
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  price_weekly int not null default 9900,      -- paise
  price_monthly int not null default 19900,
  price_quarterly int not null default 49900,
  price_annual int not null default 149900,
  commission_tiers jsonb not null default '{"Weekly":0.2,"Monthly":0.2,"Quarterly":0.25,"Annual":0.25}',
  withdraw_threshold numeric not null default 500,  -- rupees; owner-only (SQL editor)
  job_ttl_days int not null default 30,
  featured_days int not null default 7,
  premium_ratio numeric not null default 0.35,  -- P(job marked premium at submit); owner-only (SQL editor)
  updated_at timestamptz default now()
);

-- Idempotent for existing databases (column added 2026-08-22).
alter table public.site_settings add column if not exists premium_ratio numeric not null default 0.35;

-- Live-sync sentinel: bumped by a trigger whenever job_listings changes, so
-- the public /jobs page can silently refetch on realtime.
create table public.jobs_version (
  id int primary key default 1 check (id = 1),
  version bigint not null default 0
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
alter table public.jobs_version      enable row level security;

-- Operator gate (security definer so policies/RPCs can read profiles).
create or replace function public.is_operator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'operator');
$$;

-- profiles: jobseekers read/keep their own row (bank data they set themselves).
create policy "profiles read own" on public.profiles
  for select using (id = auth.uid());
-- No write policy: bank details change only via update_own_profile RPC.
-- Operators read safe columns only through the operator_profiles view.

-- job_listings: public reads go ONLY through the public_jobs view (safe columns).
-- Operators read all rows (pending/rejected/expired) for the Review Queue/Jobs tabs.
-- IMPORTANT: do NOT add a public jobseeker/anon policy on this table — RLS
-- gates ROWS, not COLUMNS, so any such policy would expose contact_info
-- (premium content) through direct selects. The view below is the gate.
create policy "jobs operator read" on public.job_listings
  for select using (public.is_operator());
-- No insert/update policies: all job writes go through gated RPCs.

-- premium_purchases: jobseekers read their own as buyer or referrer; operators read all.
create policy "purchases read own" on public.premium_purchases
  for select using (user_id = auth.uid() or referrer_user_id = auth.uid());
create policy "purchases operator read" on public.premium_purchases
  for select using (public.is_operator());
-- No anon insert: purchases are written only by process_payment (service role).

-- withdrawal_requests: jobseekers read their own; operators read all.
create policy "withdrawals read own" on public.withdrawal_requests
  for select using (user_id = auth.uid());
create policy "withdrawals operator read" on public.withdrawal_requests
  for select using (public.is_operator());
-- No anon insert: withdrawals go through /api/withdrawals (request_withdrawal RPC).

-- site_settings: public read (pricing needs it); no operator write policy.
create policy "settings public read" on public.site_settings
  for select using (true);

-- jobs_version: public read so anon realtime subscribers receive the bump.
create policy "jobs_version public read" on public.jobs_version
  for select using (true);

-- ─── Operator profiles view (column-level gate) ─────────────────────
-- Operators need email/name for Purchases + Withdrawals, but must NOT see
-- bank_* of users who never requested a payout. The WHERE clause gates the
-- whole view to operators (is_operator() reads auth.uid() from the JWT).
create or replace view public.operator_profiles
  with (security_invoker = true) as
select id, email, full_name, role, referral_code, premium_plan, premium_expires_at, created_at
from public.profiles
where public.is_operator();

grant select on public.operator_profiles to authenticated;

-- ─── Public jobs view (column-level gate) ───────────────────────────
-- Exposes only safe columns of approved, unexpired, non-stale jobs.
-- contact_info, admin_notes, agent_id, approved_by are NEVER in this view.
-- Runs as OWNER (not security_invoker): the view's WHERE + column list ARE
-- the authorization — its content is caller-independent by design, and
-- forcing RLS-as-caller here made anonymous visitors see 0 rows
-- (2026-08-21 live bug). The owner is postgres/supabase_admin whose only
-- table path is this view, so no RLS bypass of the premium contact_info
-- gate is created; operator_profiles keeps security_invoker because ITS
-- rows do depend on the caller.
create or replace view public.public_jobs as
select id, title, company, location, salary_range, experience, description,
       tags, is_premium, is_featured, featured_until, expires_at,
       source_link, apply_url, created_at, approved_at
from public.job_listings
where status = 'approved'
  and (expires_at is null or expires_at > now())
  and stale_at is null;

grant select on public.public_jobs to anon, authenticated;

-- ─── Public tags view (dynamic website filters) ─────────────────────
-- Distinct tags across the same approved/unexpired/non-stale rows as
-- public_jobs, owner-run for the same reason (caller-independent content;
-- WHERE + column list are the gate). The website builds its category
-- dropdown from this, so a dashboard-approved job with new tags ("qa",
-- "security", …) becomes a filter option immediately.
create or replace view public.public_tags as
select distinct unnest(tags) as tag
from public.job_listings
where status = 'approved'
  and (expires_at is null or expires_at > now())
  and stale_at is null
  and tags is not null;

grant select on public.public_tags to anon, authenticated;

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

-- ─── Moderation triggers (defense-in-depth; RPCs are the primary path) ─

-- Transaction-local bypass GUC: set inside the gated RPCs so their legitimate
-- writes skip the guard. pg_catalog.set_config is NOT exposed via PostgREST,
-- and request.jwt.claims cannot set a session GUC, so only these security-
-- definer functions can flip it.
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

create trigger job_listings_update_guard
  before update on public.job_listings
  for each row execute procedure public.job_listings_update_guard();

-- ─── Live-sync trigger ──────────────────────────────────────────────

create or replace function public.bump_jobs_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.jobs_version (id, version) values (1, 1)
  on conflict (id) do update set version = public.jobs_version.version + 1;
  return null;
end;
$$;

create trigger job_listings_version_bump
  after insert or update or delete on public.job_listings
  for each row execute procedure public.bump_jobs_version();

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
  p_referral_code text,
  p_expected_paise numeric default null
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
  -- Order-time price pin: the webhook passes the paise amount fixed when the
  -- Razorpay order was created, so a site_settings price change between order
  -- and capture cannot strand (or discount) a paid order. Live settings remain
  -- the fallback for captures without a pin.
  if p_expected_paise is not null then
    if abs(p_amount * 100 - p_expected_paise) > 0.99 then
      raise exception 'amount mismatch vs order: got % expected % paise', p_amount, p_expected_paise;
    end if;
  elsif abs(p_amount - v_expected) > 0.01 then
    raise exception 'amount mismatch: got % expected %', p_amount, v_expected;
  end if;

  insert into public.premium_purchases (user_id, plan, amount, payment_id, order_id, referral_code_used)
  values (p_user_id, p_plan, p_amount, p_payment_id, p_order_id, nullif(p_referral_code, ''));

  update public.profiles
  set premium_plan = p_plan,
      premium_expires_at = greatest(coalesce(premium_expires_at, now()), now()) + make_interval(days => v_days)
  where id = p_user_id;

  update public.premium_purchases
  set premium_granted_until = (select premium_expires_at from public.profiles where id = p_user_id)
  where payment_id = p_payment_id;

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

-- Withdrawal approval (operator). Consumes available commissions oldest-first
-- as a ledger (partial consumption supported). Locks the referrer's commission
-- rows so two concurrent approvals can't double-spend.
create or replace function public.approve_withdrawal(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  w public.withdrawal_requests%rowtype;
  v_left numeric;
  r record;
  v_take numeric;
begin
  if not public.is_operator() then
    raise exception 'forbidden';
  end if;

  select * into w from public.withdrawal_requests where id = p_id for update;
  if w.id is null then raise exception 'withdrawal not found'; end if;
  if w.status <> 'pending' then
    return jsonb_build_object('status', 'already_' || w.status);
  end if;

  perform 1 from public.premium_purchases
  where referrer_user_id = w.user_id
  for update;

  select sum(commission_amount - withdrawn_amount) into v_left
  from public.premium_purchases
  where referrer_user_id = w.user_id
    and (
      commission_status = 'available'
      or (commission_status = 'pending' and created_at <= now() - interval '15 minutes')
    )
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
      and (
        commission_status = 'available'
        or (commission_status = 'pending' and created_at <= now() - interval '15 minutes')
      )
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
    if not found then
      raise exception 'commission ledger changed concurrently';
    end if;
    v_left := v_left - v_take;
  end loop;

  if v_left > 0.001 then
    raise exception 'could not fully consume the commission ledger';
  end if;

  update public.withdrawal_requests
  set status = 'approved', processed_at = now(), processed_by = auth.uid()
  where id = p_id;

  return jsonb_build_object('status', 'approved');
end;
$$;

-- Withdrawal rejection (operator). Mirrors approve: only pending, idempotent.
create or replace function public.reject_withdrawal(p_id uuid, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  w public.withdrawal_requests%rowtype;
begin
  if not public.is_operator() then raise exception 'forbidden'; end if;
  if p_note is null or length(trim(p_note)) < 3 then raise exception 'note required'; end if;

  select * into w from public.withdrawal_requests where id = p_id for update;
  if w.id is null then raise exception 'withdrawal not found'; end if;
  if w.status <> 'pending' then
    return jsonb_build_object('status', 'already_' || w.status);
  end if;

  update public.withdrawal_requests
  set status = 'rejected', admin_notes = left(p_note, 1000),
      processed_at = now(), processed_by = auth.uid()
  where id = p_id;

  return jsonb_build_object('status', 'rejected');
end;
$$;

-- Misclick recovery: undo an approval BEFORE money is sent. Tight window,
-- terminal 'reversed' state, ledger restored by unwinding newest-first.
-- ponytail: unwinds by created_at desc as the inverse of oldest-first
-- consumption; correct for the single-recent-withdrawal case the 15-min
-- window guarantees. Per-posting ledger table if multi-withdrawals overlap.
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
  if w.status <> 'approved' then
    return jsonb_build_object('status', 'already_' || w.status);
  end if;
  if w.processed_at is null or w.processed_at < now() - interval '15 minutes' then
    raise exception 'reversal window expired';
  end if;

  perform 1 from public.premium_purchases
  where referrer_user_id = w.user_id
  for update;

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
    set withdrawn_amount = withdrawn_amount - v_take,
        commission_status = 'available'
    where id = r.id;
    v_left := v_left - v_take;
  end loop;

  if v_left > 0.001 then
    raise exception 'could not restore the commission ledger';
  end if;

  update public.withdrawal_requests
  set status = 'reversed', admin_notes = left(p_note, 1000),
      reversed_at = now(), reversed_by = auth.uid()
  where id = p_id;

  return jsonb_build_object('status', 'reversed');
end;
$$;

-- User-facing withdrawal request. Transactional: locks the referrer's
-- commission rows so concurrent requests cannot overdraw the balance.
create or replace function public.request_withdrawal(p_amount numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s public.site_settings%rowtype;
  v_available numeric;
  v_pending numeric;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'enter a valid amount';
  end if;

  select * into s from public.site_settings where id = 1;
  if p_amount < s.withdraw_threshold then
    raise exception 'minimum withdrawal is %', s.withdraw_threshold;
  end if;

  if not exists (
    select 1 from public.profiles
    where id = auth.uid()
      and bank_holder_name is not null and bank_account_number is not null and bank_ifsc is not null
  ) then
    raise exception 'connect your bank account first';
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

  insert into public.withdrawal_requests (user_id, amount, bank_holder_name, bank_account_number, bank_ifsc)
  select auth.uid(), p_amount, bank_holder_name, bank_account_number, bank_ifsc
  from public.profiles where id = auth.uid();

  return jsonb_build_object('status', 'created');
end;
$$;

-- Refund handling. Only a FULL refund voids the commission and revokes
-- premium; partial refunds leave everything intact. Premium expiry is
-- recomputed from the remaining non-refunded purchases' grant windows.
-- refunded_at is set regardless of commission_status: purchases made
-- WITHOUT a referral code stay 'none' and must lose premium too.
create or replace function public.void_commission(p_payment_id text, p_refund_amount numeric)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_purchase public.premium_purchases%rowtype;
begin
  select * into v_purchase from public.premium_purchases where payment_id = p_payment_id;
  if v_purchase.id is null then return; end if;

  if p_refund_amount + 0.01 < v_purchase.amount then
    return; -- partial refund: no commission void, no premium revoke
  end if;

  -- Clash: already-commission-hold spending is not safe to unspend here.
  -- Voided/pending/available get status 'voided'; 'none'/'withdrawn' keep
  -- their status but still get refunded_at so premium is revoked.
  update public.premium_purchases
  set commission_status = case
        when commission_status in ('pending', 'available') then 'voided'
        else commission_status
      end,
      refunded_at = now()
  where payment_id = p_payment_id;

  update public.profiles p
  set premium_expires_at = greatest(
        now(),
        coalesce(
          (select max(pg.premium_granted_until) from public.premium_purchases pg
           where pg.user_id = p.id and pg.refunded_at is null and pg.premium_granted_until > now()),
          now()
        )
      ),
      premium_plan = case
        when exists (
          select 1 from public.premium_purchases pg
          where pg.user_id = p.id and pg.refunded_at is null and pg.premium_granted_until > now()
        ) then p.premium_plan
        else null
      end
  where p.id = v_purchase.user_id;
end;
$$;

-- ─── Operator job RPCs (moderation) ─────────────────────────────────

-- Insert a draft. Hard-codes moderation/attribution columns so no operator
-- can submit a row that looks admin-approved. Returns the new id.
create or replace function public.submit_job(
  p_title text, p_company text, p_location text, p_salary_range text,
  p_experience text, p_description text, p_tags text[],
  p_contact_info text, p_source_link text, p_apply_url text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_expires timestamptz;
  v_premium boolean;
begin
  if not public.is_operator() then raise exception 'forbidden'; end if;

  -- Premium is assigned by weighted coin at submit time (site_settings.
  -- premium_ratio, default 0.35): the Review Queue shows the pre-marked
  -- flag, the operator glances + approves — no per-row toggling. approve_job
  -- can still flip it before the job goes live.
  select now() + make_interval(days => s.job_ttl_days),
         random() < s.premium_ratio
    into v_expires, v_premium
    from public.site_settings s where id = 1;

  insert into public.job_listings (
    agent_id, source_link, apply_url, title, company, location, salary_range,
    experience, description, contact_info, tags,
    is_premium, is_featured, featured_until, expires_at,
    status, approved_at, approved_by
  ) values (
    null, nullif(p_source_link, ''), nullif(p_apply_url, ''),
    p_title, p_company, nullif(p_location, ''), nullif(p_salary_range, ''),
    nullif(p_experience, ''), nullif(p_description, ''), nullif(p_contact_info, ''),
    coalesce(p_tags, '{}'),
    v_premium, false, null, v_expires,
    'pending_review', null, null
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Approve a draft → live. Bounds featured/expiry from settings, clears stale.
create or replace function public.approve_job(p_id uuid, p_is_premium boolean, p_is_featured boolean, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s public.site_settings%rowtype;
begin
  if not public.is_operator() then raise exception 'forbidden'; end if;

  select * into s from public.site_settings where id = 1;

  perform set_config('jobkar.bypass', 't', true);

  update public.job_listings
  set status = 'approved',
      is_premium = coalesce(p_is_premium, false),
      is_featured = coalesce(p_is_featured, false),
      featured_until = case when coalesce(p_is_featured, false)
        then now() + make_interval(days => s.featured_days) else null end,
      expires_at = now() + make_interval(days => s.job_ttl_days),
      stale_at = null,
      approved_at = now(),
      approved_by = auth.uid(),
      admin_notes = nullif(p_note, '')
  where id = p_id and status = 'pending_review';

  if not found then
    return jsonb_build_object('status', 'not_found_or_not_pending');
  end if;

  return jsonb_build_object('status', 'approved');
end;
$$;

create or replace function public.reject_job(p_id uuid, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_operator() then raise exception 'forbidden'; end if;
  if p_note is null or length(trim(p_note)) < 3 then raise exception 'note required'; end if;

  perform set_config('jobkar.bypass', 't', true);

  update public.job_listings
  set status = 'rejected', admin_notes = left(p_note, 1000)
  where id = p_id and status = 'pending_review';

  if not found then
    return jsonb_build_object('status', 'not_found_or_not_pending');
  end if;

  return jsonb_build_object('status', 'rejected');
end;
$$;

-- Renew an approved job's expiry (also clears stale so a relisted job returns).
create or replace function public.renew_job(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s public.site_settings%rowtype;
begin
  if not public.is_operator() then raise exception 'forbidden'; end if;

  select * into s from public.site_settings where id = 1;
  perform set_config('jobkar.bypass', 't', true);

  update public.job_listings
  set expires_at = now() + make_interval(days => s.job_ttl_days),
      stale_at = null
  where id = p_id and status = 'approved';

  if not found then
    return jsonb_build_object('status', 'not_found_or_not_approved');
  end if;

  return jsonb_build_object('status', 'renewed');
end;
$$;

-- Mark/unmark stale (source posting pulled). Operator-gated; the app only
-- calls it after a successful fetch positively observed the missing apply
-- element — never on a timeout/error.
create or replace function public.set_job_stale(p_id uuid, p_stale boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_operator() then raise exception 'forbidden'; end if;

  perform set_config('jobkar.bypass', 't', true);

  update public.job_listings
  set stale_at = case when p_stale then now() else null end
  where id = p_id;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  return jsonb_build_object('status', 'ok');
end;
$$;

-- Permanently delete a job (operator). Hard delete is safe: nothing
-- references job_listings, and the realtime trigger bumps jobs_version so
-- the website live-syncs. Rejected/pending cleanup is the main use —
-- stale-hiding is the softer set_job_stale path.
create or replace function public.delete_job(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_operator() then raise exception 'forbidden'; end if;

  delete from public.job_listings where id = p_id;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  return jsonb_build_object('status', 'deleted');
end;
$$;

-- Desktop settings edit (operator). Deliberately OMITS withdraw_threshold —
-- that stays owner-only via the SQL editor.
create or replace function public.update_site_settings_desktop(
  p_price_weekly int, p_price_monthly int, p_price_quarterly int, p_price_annual int,
  p_commission_tiers jsonb, p_job_ttl_days int, p_featured_days int
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_operator() then raise exception 'forbidden'; end if;
  update public.site_settings
  set price_weekly = p_price_weekly,
      price_monthly = p_price_monthly,
      price_quarterly = p_price_quarterly,
      price_annual = p_price_annual,
      commission_tiers = p_commission_tiers,
      job_ttl_days = p_job_ttl_days,
      featured_days = p_featured_days,
      updated_at = now()
  where id = 1;
end;
$$;

-- ─── RPC permissions ────────────────────────────────────────────────
-- Every SECURITY DEFINER function defaults to EXECUTE for PUBLIC, which
-- reaches anon AND authenticated. Revoke from public/anon explicitly and
-- grant back precisely. (see `supabase db advisors` — lint 0028)

-- Money RPCs: service-role ONLY.
revoke execute on function public.process_payment(uuid, text, numeric, text, text, text, numeric) from public, anon, authenticated;
-- The legacy 6-arg process_payment only exists on databases migrated in
-- place; on a fresh install a plain REVOKE on the missing signature would
-- error and abort the script before the service_role grants below run.
do $$
begin
  revoke execute on function public.process_payment(uuid, text, numeric, text, text, text) from public, anon, authenticated;
exception
  when undefined_function then null;
end
$$;
revoke execute on function public.release_commissions() from public, anon, authenticated;
revoke execute on function public.void_commission(text, numeric) from public, anon, authenticated;
grant  execute on function public.process_payment(uuid, text, numeric, text, text, text, numeric) to service_role;
grant  execute on function public.release_commissions() to service_role;
grant  execute on function public.void_commission(text, numeric) to service_role;

-- Trigger-only + auth-internals + dashboard helpers: no REST surface at all
-- (their callers are trigger commands / auth-time / postgres-owned code).
revoke execute on function public.bump_jobs_version() from public, anon, authenticated;
revoke execute on function public.job_listings_insert_guard() from public, anon, authenticated;
revoke execute on function public.job_listings_update_guard() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
drop function if exists public.rls_auto_enable();

-- Jobseeker self-service: authenticated only (bodies are auth.uid()-scoped).
revoke execute on function public.update_own_profile(text, text, text) from public, anon;
grant execute on function public.update_own_profile(text, text, text) to authenticated;
revoke execute on function public.request_withdrawal(numeric) from public, anon;
grant execute on function public.request_withdrawal(numeric) to authenticated;

-- Operator RPCs: executable by authenticated, gated inside by is_operator().
revoke execute on function public.approve_withdrawal(uuid) from public, anon;
grant execute on function public.approve_withdrawal(uuid) to authenticated;
revoke execute on function public.reject_withdrawal(uuid, text) from public, anon;
grant execute on function public.reject_withdrawal(uuid, text) to authenticated;
revoke execute on function public.reverse_withdrawal(uuid, text) from public, anon;
grant execute on function public.reverse_withdrawal(uuid, text) to authenticated;
revoke execute on function public.submit_job(text, text, text, text, text, text, text[], text, text, text) from public, anon;
grant execute on function public.submit_job(text, text, text, text, text, text, text[], text, text, text) to authenticated;
revoke execute on function public.approve_job(uuid, boolean, boolean, text) from public, anon;
grant execute on function public.approve_job(uuid, boolean, boolean, text) to authenticated;
revoke execute on function public.reject_job(uuid, text) from public, anon;
grant execute on function public.reject_job(uuid, text) to authenticated;
revoke execute on function public.renew_job(uuid) from public, anon;
grant execute on function public.renew_job(uuid) to authenticated;
revoke execute on function public.set_job_stale(uuid, boolean) from public, anon;
grant execute on function public.set_job_stale(uuid, boolean) to authenticated;
revoke execute on function public.delete_job(uuid) from public, anon;
grant execute on function public.delete_job(uuid) to authenticated;
revoke execute on function public.update_site_settings_desktop(int, int, int, int, jsonb, int, int) from public, anon;
grant execute on function public.update_site_settings_desktop(int, int, int, int, jsonb, int, int) to authenticated;

-- is_operator(): INTENTIONAL EXCEPTION — stays public. RLS policies invoke
-- it as the querying role (including anon) and the desktop renderer checks
-- operator status from it before any write. Read-only boolean self-check:
-- `exists(... id = auth.uid() and role = 'operator')` — no escalation vector.
grant execute on function public.is_operator() to public;

-- ─── Realtime (website live sync) ───────────────────────────────────
-- Guarded: re-running a script must not fail on already-published tables.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='job_listings') then
    alter publication supabase_realtime add table public.job_listings;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='premium_purchases') then
    alter publication supabase_realtime add table public.premium_purchases;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='site_settings') then
    alter publication supabase_realtime add table public.site_settings;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='jobs_version') then
    alter publication supabase_realtime add table public.jobs_version;
  end if;
end $$;
