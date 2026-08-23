-- =============================================================================
-- VAYTU — RLS EXECUTED TEST: role = anonymous (Postgres role `anon`, no JWT)
-- =============================================================================
set request.jwt.claims = '{"role":"anon"}';
set role anon;

-- ALLOW: public discovery surface -------------------------------------------------
select testing.expect_select_count('anonymous', 'sees published experiences only (2 of 3)',
  $q$select * from public.experiences$q$, 2);

select testing.expect_select_count('anonymous', 'sees creator_levels reference data',
  $q$select * from public.creator_levels$q$, 4);

select testing.expect_select_count('anonymous', 'sees business_profiles (public company directory)',
  $q$select * from public.business_profiles$q$, 2);

select testing.expect_select_count('anonymous', 'sees images of a published experience',
  $q$select * from public.experience_images where experience_id = 'ffffffff-0000-0000-0000-000000000001'$q$, 1);

select testing.expect_select_count('anonymous', 'sees slots of a published experience',
  $q$select * from public.experience_slots where experience_id = 'ffffffff-0000-0000-0000-000000000001'$q$, 1);

-- DENY: everything requiring authentication ----------------------------------------
select testing.expect_denied_select('anonymous', 'cannot see the draft experience',
  $q$select * from public.experiences where id = 'ffffffff-0000-0000-0000-000000000002'$q$);

select testing.expect_denied_select('anonymous', 'cannot see any profiles row',
  $q$select * from public.profiles$q$);

select testing.expect_denied_select('anonymous', 'cannot see any creator_profiles row',
  $q$select * from public.creator_profiles$q$);

select testing.expect_denied_select('anonymous', 'cannot see any application',
  $q$select * from public.applications$q$);

select testing.expect_denied_select('anonymous', 'cannot see creator_metric_evidence',
  $q$select * from public.creator_metric_evidence$q$);

select testing.expect_denied_select('anonymous', 'cannot see creator_verifications',
  $q$select * from public.creator_verifications$q$);

select testing.expect_denied_select('anonymous', 'cannot see admin_notes',
  $q$select * from public.admin_notes$q$);

select testing.expect_denied_select('anonymous', 'cannot see audit_log',
  $q$select * from public.audit_log$q$);

select testing.expect_denied_select('anonymous', 'cannot see notifications',
  $q$select * from public.notifications$q$);

select testing.expect_denied('anonymous', 'cannot insert an experience',
  $q$insert into public.experiences (business_id, title, description, compensation_type)
     values ('44444444-4444-4444-4444-444444444444', 'x', 'x', 'paid')$q$);

select testing.expect_denied('anonymous', 'cannot insert an application',
  $q$insert into public.applications (experience_id, creator_id, business_id)
     values ('ffffffff-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444')$q$);

select testing.expect_denied('anonymous', 'cannot update an experience',
  $q$update public.experiences set title = 'hacked' where id = 'ffffffff-0000-0000-0000-000000000001'$q$);

reset role;
reset request.jwt.claims;
