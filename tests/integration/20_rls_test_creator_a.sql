-- =============================================================================
-- VAYTU — RLS EXECUTED TEST: role = creator_A (22222222-...-2222)
-- =============================================================================
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set role authenticated;

-- ALLOW: sees own data --------------------------------------------------------
select testing.expect_select_count('creator_A', 'sees own profile',
  $q$select * from public.profiles where id = '22222222-2222-2222-2222-222222222222'$q$, 1);

select testing.expect_select_count('creator_A', 'sees own creator_profile',
  $q$select * from public.creator_profiles where id = '22222222-2222-2222-2222-222222222222'$q$, 1);

select testing.expect_select_count('creator_A', 'sees own creator_metrics',
  $q$select * from public.creator_metrics where creator_id = '22222222-2222-2222-2222-222222222222'$q$, 1);

select testing.expect_select_count('creator_A', 'sees own creator_metric_evidence',
  $q$select * from public.creator_metric_evidence where creator_id = '22222222-2222-2222-2222-222222222222'$q$, 1);

select testing.expect_select_count('creator_A', 'sees own creator_verifications',
  $q$select * from public.creator_verifications where creator_id = '22222222-2222-2222-2222-222222222222'$q$, 1);

select testing.expect_select_count('creator_A', 'sees own application',
  $q$select * from public.applications where creator_id = '22222222-2222-2222-2222-222222222222'$q$, 1);

select testing.expect_select_count('creator_A', 'sees own notification',
  $q$select * from public.notifications where user_id = '22222222-2222-2222-2222-222222222222'$q$, 1);

select testing.expect_select_count('creator_A', 'sees published experiences to browse (2)',
  $q$select * from public.experiences where status = 'published'$q$, 2);

select testing.expect_select_count('creator_A', 'sees business_profiles (public directory)',
  $q$select * from public.business_profiles$q$, 2);

-- ALLOW: writes within own scope ----------------------------------------------
select testing.expect_allowed_write('creator_A', 'can update own bio',
  $q$update public.creator_profiles set bio = 'Travel & food creator' where id = '22222222-2222-2222-2222-222222222222'$q$);

select testing.expect_allowed_write('creator_A', 'can insert a new self-reported metric',
  $q$insert into public.creator_metrics (creator_id, platform, followers_count, source, is_verified)
     values ('22222222-2222-2222-2222-222222222222', 'tiktok', 8000, 'self_reported', false)$q$);

select testing.expect_allowed_write('creator_A', 'can withdraw own pending application',
  $q$update public.applications set status = 'withdrawn'
     where id = '33333333-aaaa-0000-0000-000000000001' and creator_id = '22222222-2222-2222-2222-222222222222'$q$);

select testing.expect_allowed_write('creator_A', 'can mark own notification as read',
  $q$update public.notifications set is_read = true where user_id = '22222222-2222-2222-2222-222222222222'$q$);

-- DENY: cannot see other creators' private/scoped data -------------------------
select testing.expect_denied_select('creator_A', 'cannot see creator_B''s creator_profile',
  $q$select * from public.creator_profiles where id = '33333333-3333-3333-3333-333333333333'$q$);

select testing.expect_denied_select('creator_A', 'cannot see creator_B''s creator_metric_evidence',
  $q$select * from public.creator_metric_evidence where creator_id = '33333333-3333-3333-3333-333333333333'$q$);

select testing.expect_denied_select('creator_A', 'cannot see creator_B''s creator_verifications',
  $q$select * from public.creator_verifications where creator_id = '33333333-3333-3333-3333-333333333333'$q$);

select testing.expect_denied_select('creator_A', 'cannot see creator_B''s application',
  $q$select * from public.applications where id = '33333333-aaaa-0000-0000-000000000002'$q$);

select testing.expect_denied_select('creator_A', 'cannot see admin_notes',
  $q$select * from public.admin_notes$q$);

select testing.expect_denied_select('creator_A', 'cannot see audit_log',
  $q$select * from public.audit_log$q$);

select testing.expect_denied_select('creator_A', 'cannot see business_A''s draft experience',
  $q$select * from public.experiences where id = 'ffffffff-0000-0000-0000-000000000002'$q$);

-- DENY: cannot modify protected / system-controlled fields ----------------------
select testing.expect_denied('creator_A', 'cannot modify own reliability_score',
  $q$update public.creator_profiles set reliability_score = 99 where id = '22222222-2222-2222-2222-222222222222'$q$);

-- (creator_A's verification_status is already 'verified' from fixture seeding;
-- assert against 'rejected' so this is a genuine attempted change, not a no-op.)
select testing.expect_denied('creator_A', 'cannot modify own verification_status',
  $q$update public.creator_profiles set verification_status = 'rejected' where id = '22222222-2222-2222-2222-222222222222'$q$);

select testing.expect_denied('creator_A', 'cannot modify own current_level_id (Vaytu Level)',
  $q$update public.creator_profiles set current_level_id = 'aaaaaaaa-0000-0000-0000-000000000002' where id = '22222222-2222-2222-2222-222222222222'$q$);

select testing.expect_denied('creator_A', 'cannot modify own completed_collaborations_count',
  $q$update public.creator_profiles set completed_collaborations_count = 999 where id = '22222222-2222-2222-2222-222222222222'$q$);

select testing.expect_denied('creator_A', 'cannot self-promote to admin role',
  $q$update public.profiles set role = 'admin' where id = '22222222-2222-2222-2222-222222222222'$q$);

select testing.expect_denied('creator_A', 'cannot mark own metric as verified',
  $q$update public.creator_metrics set is_verified = true where creator_id = '22222222-2222-2222-2222-222222222222'$q$);

select testing.expect_denied('creator_A', 'cannot insert a metric claiming verified source',
  $q$insert into public.creator_metrics (creator_id, platform, followers_count, source, is_verified)
     values ('22222222-2222-2222-2222-222222222222', 'youtube', 1000000, 'verified', true)$q$);

select testing.expect_denied('creator_A', 'cannot insert an application impersonating another creator',
  $q$insert into public.applications (experience_id, creator_id, business_id)
     values ('ffffffff-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555')$q$);

select testing.expect_denied('creator_A', 'cannot insert an admin_note',
  $q$insert into public.admin_notes (target_table, target_id, author_id, note)
     values ('creator_profiles', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'self note')$q$);

select testing.expect_denied('creator_A', 'cannot insert directly into audit_log',
  $q$insert into public.audit_log (actor_id, action, table_name, record_id)
     values ('22222222-2222-2222-2222-222222222222', 'insert', 'profiles', '22222222-2222-2222-2222-222222222222')$q$);

reset role;
reset request.jwt.claims;
