-- ═══════════════════════════════════════════════════════════════════
-- Jobkar — seed data
-- Run AFTER schema.sql in Supabase → SQL Editor.
-- Migrates the 12 demo jobs so the site is not empty at launch.
-- ═══════════════════════════════════════════════════════════════════

insert into public.site_settings (id) values (1)
on conflict (id) do nothing;

-- The moderation insert trigger forces pending_review unless the bypass GUC
-- is set. Seed jobs must go live immediately, so set it transaction-locally.
begin;
select set_config('jobkar.bypass', 't', true);

insert into public.job_listings
  (title, company, location, salary_range, experience, tags, is_premium,
   is_featured, featured_until, status, approved_at, expires_at, contact_info, description)
values
  ('Delivery Driver', 'Swiggy', 'Mumbai', '₹18,000 - ₹22,000', '0-2 yrs',
   '{Full-time,On-field}', false, false, null, 'approved', now(), now() + interval '30 days',
   'HR: Priya Sharma, 98200 11111, jobs.mumbai@swiggy.in',
   'Deliver food orders across assigned zones in Mumbai. Own two-wheeler and license required. Incentives on every delivery beyond daily target.'),

  ('Electrician', 'Urban Company', 'Delhi', '₹25,000 - ₹35,000', '2-4 yrs',
   '{Full-time,Skilled}', true, true, now() + interval '7 days', 'approved', now(), now() + interval '30 days',
   'HR: Amit Verma, 98110 22222, hiring@urbancompany.com',
   'At-home electrical service calls across South Delhi. ITI certification preferred. Tools provided; steady daily bookings via the UC partner app.'),

  ('Plumber', 'Housejoy', 'Bangalore', '₹20,000 - ₹28,000', '1-3 yrs',
   '{Full-time,Skilled}', true, false, null, 'approved', now(), now() + interval '30 days',
   'HR: Rekha N, 98450 33333, careers@housejoy.in',
   'Residential plumbing installs and repairs across Whitefield and KR Puram. Own tool kit preferred. Weekly payment option available.'),

  ('Security Guard', 'G4S', 'Chennai', '₹15,000 - ₹18,000', '0-1 yr',
   '{Full-time,On-field}', false, false, null, 'approved', now(), now() + interval '30 days',
   'HR: Suresh M, 98400 44444, recruitment.chennai@g4s.com',
   'Guard duty at IT park in Sholinganallur. 12-hour shifts, rotation weekly. Uniform and training provided; PSARA licence a plus.'),

  ('Housekeeping Staff', 'Hotel Taj', 'Mumbai', '₹16,000 - ₹20,000', '0-2 yrs',
   '{Full-time,Hospitality}', true, false, null, 'approved', now(), now() + interval '30 days',
   'HR: Farida K, 98200 55555, hr.mumbai@tajhotels.com',
   'Room and lobby housekeeping at the Colaba property. Meals on duty and uniform provided. Experience preferred but not required.'),

  ('AC Technician', 'Blue Star', 'Hyderabad', '₹22,000 - ₹30,000', '2-5 yrs',
   '{Full-time,Skilled}', true, false, null, 'approved', now(), now() + interval '30 days',
   'HR: Kalyan R, 99490 66666, careers.hyderabad@bluestarindia.com',
   'Split/window AC installation and service across Hyderabad. RAC certification preferred. Company vehicle for outstation calls.'),

  ('Warehouse Associate', 'Amazon', 'Pune', '₹17,000 - ₹21,000', '0-2 yrs',
   '{Full-time,On-field}', false, false, null, 'approved', now(), now() + interval '30 days',
   'HR: Nilesh P, 98220 77777, jq-support@amazon.com',
   'Picking, packing and stowing at the Chakan fulfilment centre. 8-hour rotational shifts; cab and canteen facilities available.'),

  ('Carpenter', 'HomeLane', 'Bengaluru', '₹25,000 - ₹40,000', '3-6 yrs',
   '{Full-time,Skilled}', true, true, now() + interval '7 days', 'approved', now(), now() + interval '30 days',
   'HR: Mahesh B, 98450 88888, hiring@homelane.com',
   'On-site modular furniture installation for handover homes. Experience with ply, hardware and fittings required. Paid per project plus base.'),

  ('Delivery Executive', 'Zomato', 'Delhi NCR', '₹18,000 - ₹25,000', '0-3 yrs',
   '{Full-time,On-field}', true, false, null, 'approved', now(), now() + interval '30 days',
   'HR: Rahul T, 98110 99999, partners@zomato.com',
   'Food delivery across Gurugram and Dwarka. Bike and license mandatory. Earnings paid weekly; surge pay on peak hours.'),

  ('Painter', 'Asian Paints', 'Kolkata', '₹20,000 - ₹28,000', '2-5 yrs',
   '{Full-time,Skilled}', true, false, null, 'approved', now(), now() + interval '30 days',
   'HR: Bimal D, 98300 12121, contractor.hiring@asianpaints.com',
   'Interior/exterior painting for contractor sites across Kolkata. Experienced hands get team-lead roles. Materials provided.'),

  ('Driver', 'Ola Cabs', 'Mumbai', '₹15,000 - ₹20,000', '1-4 yrs',
   '{Full-time,On-field}', false, false, null, 'approved', now(), now() + interval '30 days',
   'HR: Vincent L, 98200 13131, drive.mumbai@olacabs.com',
   'App-based cab driving in Mumbai suburbs. Commercial badge (yellow plate) required. Daily deposit model; keep everything above it.'),

  ('Welder', 'Tata Steel', 'Jamshedpur', '₹22,000 - ₹30,000', '2-5 yrs',
   '{Full-time,Skilled}', true, false, null, 'approved', now(), now() + interval '30 days',
   'HR: Arjun S, 92000 14141, trade.hiring@tatasteel.com',
   'ARC and MIG welding at the Jamshedpur works. ITI welder trade with 2+ years. Safety gear and PF provided; contract-to-roll path.');

commit;

-- ═══════════════════════════════════════════════════════════════════
-- Creating YOUR operator accounts (you + friend, for the desktop app)
-- (profiles.id must reference a real auth.users row, so create the
--  user FIRST in the dashboard, then flip the role here.)
--
-- 1. Supabase → Authentication → Users → "Add user"
--    → email + password (e.g. you@jobkar.in) → Create user.
--    The handle_new_user trigger auto-creates their profile.
-- 2. Run:
--      update public.profiles set role = 'operator' where email = 'you@jobkar.in';
--      update public.profiles set role = 'operator' where email = 'friend@jobkar.in';
-- 3. Log in with those credentials in the desktop dashboard app (.exe).
--    The website itself has no admin login — operators browse as jobseekers.
-- ═══════════════════════════════════════════════════════════════════
