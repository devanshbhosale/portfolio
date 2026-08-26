-- Applied to the live DB via Supabase MCP on 2026-08-26 (migration
-- `lifetime-plan-and-mrp-prices`). Mirrored into supabase/schema.sql.
--
-- Offered plan set shrinks to Weekly / Monthly / Lifetime.
-- Quarterly + Annual are retired from sale: their site_settings price columns
-- and process_payment branches STAY so legacy buyers keep their expiry and any
-- pre-change captured payment still replays (order-time price pin protects
-- amounts). Lifetime = 36500 days so the global premium = expires_at > now()
-- rule keeps working unchanged everywhere.

-- 1. Lifetime charged price + struck-through display MRPs (dashboard-editable).
alter table public.site_settings
  add column if not exists price_lifetime int not null default 99900,
  add column if not exists mrp_weekly int not null default 19900,
  add column if not exists mrp_monthly int not null default 39900,
  add column if not exists mrp_lifetime int not null default 499900;

-- 2. Accept 'Lifetime' in plan CHECKs (Quarterly/Annual kept for legacy).
alter table public.profiles drop constraint profiles_premium_plan_check;
alter table public.profiles add constraint profiles_premium_plan_check
  check (premium_plan::text in ('Weekly', 'Monthly', 'Quarterly', 'Annual', 'Lifetime'));
alter table public.premium_purchases drop constraint premium_purchases_plan_check;
alter table public.premium_purchases add constraint premium_purchases_plan_check
  check (plan::text in ('Weekly', 'Monthly', 'Quarterly', 'Annual', 'Lifetime'));

-- 3. process_payment: Lifetime branch (100y) + price_lifetime fallback price.
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
    when 'Weekly' then 7 when 'Monthly' then 30 when 'Lifetime' then 36500
    when 'Quarterly' then 90 when 'Annual' then 365 else null end;
  v_expected := case p_plan
    when 'Weekly' then s.price_weekly when 'Monthly' then s.price_monthly
    when 'Lifetime' then s.price_lifetime
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
      -- Missing-key fallback is plan-aware (pre-ship review fix): retired
      -- Quarterly/Annual were sold at 25%, so a dashboard save that drops
      -- their keys must not silently re-price a legacy referral to 20%.
      v_tier := coalesce(
        (s.commission_tiers ->> p_plan)::numeric,
        case when p_plan in ('Quarterly', 'Annual') then 0.25 else 0.2 end
      );
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

-- 4. Settings RPC: new plan set + MRPs replace quarterly/annual args.
drop function if exists public.update_site_settings_desktop(int, int, int, int, jsonb, int, int);
create function public.update_site_settings_desktop(
  p_price_weekly int, p_price_monthly int, p_price_lifetime int,
  p_mrp_weekly int, p_mrp_monthly int, p_mrp_lifetime int,
  p_commission_tiers jsonb, p_job_ttl_days int, p_featured_days int
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_operator() then raise exception 'forbidden'; end if;
  update public.site_settings
  set price_weekly = p_price_weekly,
      price_monthly = p_price_monthly,
      price_lifetime = p_price_lifetime,
      mrp_weekly = p_mrp_weekly,
      mrp_monthly = p_mrp_monthly,
      mrp_lifetime = p_mrp_lifetime,
      commission_tiers = p_commission_tiers,
      job_ttl_days = p_job_ttl_days,
      featured_days = p_featured_days,
      updated_at = now()
  where id = 1;
end;
$$;
revoke execute on function public.update_site_settings_desktop(int, int, int, int, int, int, jsonb, int, int) from public, anon;
grant execute on function public.update_site_settings_desktop(int, int, int, int, int, int, jsonb, int, int) to authenticated;

-- 5. Offered referral tiers: 20% Weekly/Monthly, 25% Lifetime. Legacy keys are
-- KEPT so a replay of a referred pre-change Quarterly/Annual capture pays the
-- 25% in force at purchase.
update public.site_settings
set commission_tiers = '{"Weekly":0.2,"Monthly":0.2,"Lifetime":0.25,"Quarterly":0.25,"Annual":0.25}'::jsonb
where id = 1;
