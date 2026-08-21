-- ============================================================
-- Live fix 2026-08-21: /jobs shows "0 Active Jobs"
-- ============================================================
-- Root cause: public_jobs was created WITH (security_invoker = true), so a
-- query through it runs job_listings' RLS AS THE CALLER. The only base-table
-- SELECT policy is operator-only -> anonymous visitors get 0 rows.
-- (Verified live: service role sees 14 rows, anon key sees 0.)
--
-- Fix: run the view as its owner (SECURITY DEFINER, the PG default) and keep
-- the view's own definition as the authorization gate:
--   * WHERE status='approved' AND unexpired AND non-stale  -> row gate
--   * SELECT only the 16 safe columns                      -> column gate
--     (contact_info/admin_notes/agent_id/approved_by are absent)
-- Because anon's only base-table policy remains operator-only, direct
-- /rest/v1/job_listings reads by anon still return 0 rows, so the premium
-- contact_info gate is NOT weakened by this change.
--
-- The 2026-08-20 hardening added security_invoker as a blanket rule; this
-- view is the documented exception: its content is caller-independent by
-- design, so RLS-as-caller only breaks it. (operator_profiles keeps
-- security_invoker because ITS rows depend on the caller.)

drop view if exists public.public_jobs;
create view public.public_jobs as
select id, title, company, location, salary_range, experience, description,
       tags, is_premium, is_featured, featured_until, expires_at,
       source_link, apply_url, created_at, approved_at
from public.job_listings
where status = 'approved'
  and (expires_at is null or expires_at > now())
  and stale_at is null;

grant select on public.public_jobs to anon, authenticated;

-- Clean up the two junk listings from earlier scrape testing
-- ('Additional Details' was a scraped section header approved by accident;
-- the Apprentice Engineer entry is a malformed test row still pending).
delete from public.job_listings
 where title in ('Additional Details', 'Apprentice Engineer ( 86659518 )');

-- Verification (run after):
-- Anonymous should now see the approved count:
select count(*) from public.public_jobs;  -- via service role expects 12
