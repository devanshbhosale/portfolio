-- ============================================================
-- Live fix 2026-08-24: paywall lock + job_marks table
-- ============================================================
-- Run ONCE in Supabase → SQL Editor → New query, on the live DB.
--
-- 1) PAYWALL LOCK. Closes the premium-data leak: public_jobs is no longer
--    readable by anon/authenticated. Until now the view shipped apply_url,
--    full title/company and description of premium rows to ANY caller with
--    the public anon key — the site's blur was cosmetic. Job lists are now
--    served by the website's server-side /api/jobs route (service role +
--    entitlement redaction in lib/jobRedaction.ts), so visitors lose
--    nothing except the ability to pull premium fields from
--    /rest/v1/public_jobs for free.
--
--    DEPLOY ORDER: deploy the website build BEFORE (or together with)
--    running this script. The new build no longer queries public_jobs from
--    the browser; the old one does, and would show an empty feed between
--    the revoke and the deploy.
--
-- 2) JOB_MARKS. Per-user saved/applied job memory, synced on login
--    (lib/jobMarks.ts). localStorage stays the guest cache.

revoke select on public.public_jobs from anon, authenticated;

create table if not exists public.job_marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.job_listings(id) on delete cascade,
  saved boolean not null default false,
  applied boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create index if not exists job_marks_user_id_idx on public.job_marks (user_id);

alter table public.job_marks enable row level security;

drop policy if exists "job marks read own" on public.job_marks;
drop policy if exists "job marks insert own" on public.job_marks;
drop policy if exists "job marks update own" on public.job_marks;
drop policy if exists "job marks delete own" on public.job_marks;
create policy "job marks read own" on public.job_marks
  for select using (user_id = auth.uid());
create policy "job marks insert own" on public.job_marks
  for insert with check (user_id = auth.uid());
create policy "job marks update own" on public.job_marks
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "job marks delete own" on public.job_marks
  for delete using (user_id = auth.uid());

-- ─── Verification (run after) ───────────────────────────────────
-- 1) Must now FAIL with permission denied (anon key):
--      curl "$SUPABASE_URL/rest/v1/public_jobs?select=id&limit=1" \
--           -H "apikey: $ANON_KEY"
-- 2) Same query with the SERVICE-ROLE key must keep returning rows.
-- 3) select count(*) from public.job_marks;  -- exists, 0 rows
