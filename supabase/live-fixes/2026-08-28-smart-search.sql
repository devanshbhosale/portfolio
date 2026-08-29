-- ═══════════════════════════════════════════════════════════════════
-- Smart Search v3 (2026-08-28) — facet columns + parse trigger + backfill,
-- trgm indexes, public_jobs view +4 columns, search_jobs + suggest_job_query.
-- Idempotent: safe to re-run. Mirrors supabase/schema.sql (v11).
-- Apply via Supabase SQL editor / MCP execute_sql as postgres.
-- ═══════════════════════════════════════════════════════════════════

-- 1) Trigram extension: ILIKE acceleration + similarity for did-you-mean.
create extension if not exists pg_trgm;

-- 2) Parsed facets on job_listings (numeric mirrors of salary_range/experience).
alter table public.job_listings
  add column if not exists salary_monthly_min int,
  add column if not exists salary_monthly_max int,
  add column if not exists exp_min_months int,
  add column if not exists exp_max_months int;

-- 3) Trigger: parse salary_range + experience into facets on every write.
-- Ports lib/jobsFilters.ts parseSalaryRange (monthly; LPA ÷12; "20k" ×1000;
-- first number before LPA wins). Null-safe: clears facets when the source
-- text is null/empty. Unparseable → null facets → matches every bucket.
create or replace function public.parse_job_facets()
returns trigger language plpgsql set search_path = public as $$
declare
  v text;
  m text[];
  n numeric;
  nums int[];
begin
  -- Reset first so an UPDATE that clears the text clears the facet too.
  new.salary_monthly_min := null;
  new.salary_monthly_max := null;
  new.exp_min_months := null;
  new.exp_max_months := null;

  v := new.salary_range;
  if v is not null and btrim(v) <> '' then
    v := lower(v);
    -- Leading-digit anchors: '[\d.]+' would capture trailing dots / lone
    -- commas and crash the numeric cast (''::numeric raises 22P02).
    m := regexp_match(v, '(\d+(?:\.\d+)?)\s*(?:lpa|lakh|lakhs)');
    if m is not null then
      -- LPA/Lakh text is yearly → monthly.
      n := round(m[1]::numeric * 100000 / 12);
      new.salary_monthly_min := n::int;
      new.salary_monthly_max := n::int;
    else
      nums := array[]::int[];
      for m in select * from regexp_matches(v, '(\d[\d,]*(?:\.\d+)?)\s*(k?)', 'g') loop
        n := replace(m[1], ',', '')::numeric;
        if m[2] = 'k' then n := n * 1000; end if;
        if n > 0 then nums := nums || least(round(n), 2147483647)::int; end if;
      end loop;
      if array_length(nums, 1) > 0 then
        new.salary_monthly_min := (select min(x) from unnest(nums) x);
        new.salary_monthly_max := (select max(x) from unnest(nums) x);
      end if;
    end if;
  end if;

  v := new.experience;
  if v is not null and btrim(v) <> '' then
    v := lower(v);
    if v ~ 'fresher' then
      new.exp_min_months := 0;
      new.exp_max_months := 0;
    elsif v ~ '\d\s*[-–]\s*\d' then
      m := regexp_match(v, '(\d+)\s*[-–]\s*(\d+)');
      new.exp_min_months := m[1]::int * 12;
      new.exp_max_months := m[2]::int * 12;
    elsif v ~ '\d\s*\+' then
      m := regexp_match(v, '(\d+)\s*\+');
      new.exp_min_months := m[1]::int * 12;
      -- "5+" → no upper bound.
    elsif v ~ '\d' then
      m := regexp_match(v, '(\d+)');
      new.exp_min_months := m[1]::int * 12;
      new.exp_max_months := m[1]::int * 12;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists parse_job_facets_trg on public.job_listings;
create trigger parse_job_facets_trg
  before insert or update on public.job_listings
  for each row execute procedure public.parse_job_facets();

-- 4) One-shot backfill of the 4 facet columns (fires the trigger above and,
--    harmlessly, the moderation guard + jobs_version bump).
update public.job_listings set salary_range = salary_range;

-- 5) Trigram indexes for the ILIKE token search.
create index if not exists job_listings_title_trgm_idx
  on public.job_listings using gin (title gin_trgm_ops);
create index if not exists job_listings_company_trgm_idx
  on public.job_listings using gin (company gin_trgm_ops);
create index if not exists job_listings_description_trgm_idx
  on public.job_listings using gin (description gin_trgm_ops);

-- 6) Append the facet columns to the public view (explicit column list is
--    the authorization — same safe-columns contract, 4 additive numerics).
create or replace view public.public_jobs as
select id, title, company, location, salary_range, experience, description,
       tags, is_premium, is_featured, featured_until, expires_at,
       source_link, apply_url, created_at, approved_at,
       salary_monthly_min, salary_monthly_max, exp_min_months, exp_max_months
from public.job_listings
where status = 'approved'
  and (expires_at is null or expires_at > now())
  and stale_at is null;

revoke select on public.public_jobs from anon, authenticated;

-- 7) search_jobs — AND/OR text matching + structured filters + facets.
-- SECURITY DEFINER reads ONLY the public_jobs view (safe columns; its WHERE +
-- column list stay the authorization). Service-role ONLY — the website route
-- redacts premium fields per row before anything reaches a browser.
-- OR across fields within a token, AND across tokens. Salary/experience use
-- bucket-overlap with unknown-included (null facets match every bucket).
create or replace function public.search_jobs(
  p_q_tokens text[] default '{}',
  p_location_variants text[] default '{}',
  p_tag text default null,
  p_premium boolean default null,
  p_salary_min int default null,
  p_salary_max int default null,
  p_exp_min int default null,
  p_exp_max int default null,
  p_posted_days int default null,
  p_sort text default 'default',
  p_page int default 0,
  p_page_size int default 9
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  p_page := coalesce(p_page, 0);
  p_page_size := coalesce(p_page_size, 9);
  if p_page < 0 then p_page := 0; end if;
  if p_page > 10000 then p_page := 10000; end if; -- int4 window math safety
  p_page_size := least(greatest(p_page_size, 1), 50);
  p_q_tokens := coalesce(p_q_tokens, '{}');
  p_location_variants := coalesce(p_location_variants, '{}');

  with base as (
    select j.*
    from public.public_jobs j
    where (p_premium is null or j.is_premium = p_premium)
      and (p_tag is null or p_tag = any (j.tags))
      and (cardinality(p_q_tokens) = 0 or coalesce((
            select bool_and(
              coalesce(j.title ilike '%' || t || '%', false)
              or coalesce(j.company ilike '%' || t || '%', false)
              or coalesce(j.description ilike '%' || t || '%', false)
              or exists (select 1 from unnest(j.tags) tg where tg ilike '%' || t || '%')
            )
            from unnest(p_q_tokens) t
          ), true))
      and (cardinality(p_location_variants) = 0
           or j.location ilike any (
                array(select '%' || lv || '%' from unnest(p_location_variants) lv)))
      and (p_posted_days is null
           or j.approved_at >= now() - make_interval(days => p_posted_days))
      and (p_salary_min is null
           or (j.salary_monthly_min is null and j.salary_monthly_max is null)
           or (coalesce(j.salary_monthly_min, 0) <= coalesce(p_salary_max, 2147483647)
               and coalesce(j.salary_monthly_max, 2147483647) >= p_salary_min))
      and (p_exp_min is null
           or (j.exp_min_months is null and j.exp_max_months is null)
           or (coalesce(j.exp_min_months, 0) <= coalesce(p_exp_max, 999999)
               and coalesce(j.exp_max_months, 999999) >= p_exp_min))
  ),
  ranked as (
    select row_number() over (
      order by
        case when coalesce(p_sort, 'default') = 'salary'
             then b.salary_monthly_max end desc nulls last,
        case when coalesce(p_sort, 'default') = 'default' and b.is_featured
             then 1 else 0 end desc,
        b.approved_at desc nulls last
    ) as rn,
    to_jsonb(b) as job
    from base b
  ),
  tag_facets as (
    select tg as value, count(*)::int as count
    from base b cross join lateral unnest(b.tags) tg
    where coalesce(tg, '') <> ''
    group by tg order by count desc, value asc limit 12
  ),
  loc_facets as (
    select btrim(b.location) as value, count(*)::int as count
    from base b
    where coalesce(btrim(b.location), '') <> ''
    group by btrim(b.location) order by count desc, value asc limit 6
  ),
  buckets as (
    select
      count(*) filter (where coalesce(exp_min_months, 0) <= 12
                        and coalesce(exp_max_months, 999999) >= 0)::int as fresher,
      count(*) filter (where coalesce(exp_min_months, 0) <= 24
                        and coalesce(exp_max_months, 999999) >= 0)::int as one_to_two,
      count(*) filter (where coalesce(exp_min_months, 0) <= 60
                        and coalesce(exp_max_months, 999999) >= 24)::int as two_to_five,
      count(*) filter (where coalesce(exp_min_months, 0) <= 999999
                        and coalesce(exp_max_months, 999999) >= 60)::int as five_plus,
      count(*) filter (where coalesce(salary_monthly_min, 0) <= 20000
                        and coalesce(salary_monthly_max, 2147483647) >= 0)::int as under_20k,
      count(*) filter (where coalesce(salary_monthly_min, 0) <= 35000
                        and coalesce(salary_monthly_max, 2147483647) >= 20000)::int as to_35k,
      count(*) filter (where coalesce(salary_monthly_min, 0) <= 2147483647
                        and coalesce(salary_monthly_max, 2147483647) >= 35000)::int as over_35k
    from base
  )
  select jsonb_build_object(
    'total', (select count(*)::int from base),
    'jobs', (
      select coalesce(jsonb_agg(r.job order by r.rn), '[]'::jsonb)
      from ranked r
      where r.rn > p_page * p_page_size
        and r.rn <= (p_page + 1) * p_page_size
    ),
    'facets', jsonb_build_object(
      'tags', (select coalesce(jsonb_agg(jsonb_build_object('value', value, 'count', count)
                                          order by count desc, value asc), '[]'::jsonb) from tag_facets),
      'locations', (select coalesce(jsonb_agg(jsonb_build_object('value', value, 'count', count)
                                             order by count desc, value asc), '[]'::jsonb) from loc_facets),
      'experience', (select jsonb_build_object('fresher', fresher, 'oneToTwo', one_to_two,
                                               'twoToFive', two_to_five, 'fivePlus', five_plus) from buckets),
      'salary', (select jsonb_build_object('under20k', under_20k, 'to35k', to_35k,
                                           'over35k', over_35k) from buckets)
    )
  ) into v_result;
  return v_result;
end;
$$;

-- 8) suggest_job_query — one trigram-similar approved-title word ("did you mean").
create or replace function public.suggest_job_query(q text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select word
  from (
    select distinct t as word
    from public.public_jobs j
    cross join lateral unnest(regexp_split_to_array(lower(coalesce(j.title, '')), '[^a-z0-9]+')) t
    where length(t) >= 3
  ) w
  where word % q
  order by similarity(word, q) desc, word asc
  limit 1;
$$;

-- 9) Grants: service_role only (default EXECUTE would leak these to anon).
revoke execute on function public.search_jobs(text[], text[], text, boolean, int, int, int, int, int, text, int, int)
  from public, anon, authenticated;
grant execute on function public.search_jobs(text[], text[], text, boolean, int, int, int, int, int, text, int, int)
  to service_role;

revoke execute on function public.suggest_job_query(text) from public, anon, authenticated;
grant execute on function public.suggest_job_query(text) to service_role;
