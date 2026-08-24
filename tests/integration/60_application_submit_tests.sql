-- =============================================================================
-- VAYTU — Targeted CREATOR APPLICATION SUBMIT tests
-- =============================================================================
-- Covers the "creator application fails" production bug investigation: the
-- 6 role files (10–40) never actually exercised a LEGITIMATE application
-- INSERT succeeding — only a single DENY case (impersonating another
-- creator, in 20_rls_test_creator_a.sql). This file closes that gap and
-- proves, against the real RLS engine, the exact scenarios the bug report
-- asked about: a clean insert, a draft experience, a duplicate, and a
-- business_id mismatch — plus the real side effects (row count, status,
-- notification fan-out) an insert is supposed to produce.
--
-- Fixture identities used here (see 01_seed_fixtures.sql):
--   creator_B  = 33333333-3333-3333-3333-333333333333 (no existing app to
--                business_A's experiences)
--   business_A = 44444444-4444-4444-4444-444444444444
--   experience ...0001 = business_A, PUBLISHED (creator_A already has a
--                pending application here — untouched by this file)
--   experience ...0002 = business_A, DRAFT (never published)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ALLOW: creator_B applies to business_A's published experience — the exact
-- payload shape createApplication() sends (experience_id, slot_id=null,
-- creator_id, business_id, status='pending', message).
-- -----------------------------------------------------------------------------
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set role authenticated;

select testing.expect_allowed_write('creator_B', 'submits a real application to a published experience',
  $q$insert into public.applications (experience_id, slot_id, creator_id, business_id, status, message)
     values ('ffffffff-0000-0000-0000-000000000001', null,
             '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444',
             'pending', 'Ciao, sono molto interessato a questa esperienza.')$q$);

-- DENY: the same creator cannot apply to a DRAFT (unpublished) experience —
-- the RLS policy's EXISTS check requires e.status = 'published'.
select testing.expect_denied('creator_B', 'cannot apply to a draft experience',
  $q$insert into public.applications (experience_id, creator_id, business_id, status)
     values ('ffffffff-0000-0000-0000-000000000002',
             '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'pending')$q$);

-- DENY: business_id mismatch — the real experience's business_id is
-- business_A (...4444...), not business_B (...5555...); the RLS policy's
-- EXISTS check ties applications.business_id to the matching experience row.
select testing.expect_denied('creator_B', 'cannot insert with a business_id that does not match the experience',
  $q$insert into public.applications (experience_id, creator_id, business_id, status)
     values ('ffffffff-0000-0000-0000-000000000001',
             '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 'pending')$q$);

reset role;
reset request.jwt.claims;

-- -----------------------------------------------------------------------------
-- DENY (constraint-level): creator_A already has a pending application to
-- experience ...0001 (seeded by 01_seed_fixtures.sql). A second attempt must
-- be rejected — by the applications_one_per_creator_per_experience UNIQUE
-- constraint (23505), not by RLS (42501), so this uses expect_rejected
-- (any real DB refusal counts), matching the documented convention in
-- 02_test_helpers.sql for CHECK/UNIQUE-enforced invariants.
-- -----------------------------------------------------------------------------
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set role authenticated;

select testing.expect_rejected('creator_A', 'cannot submit a second application to the same experience',
  $q$insert into public.applications (experience_id, creator_id, business_id, status)
     values ('ffffffff-0000-0000-0000-000000000001',
             '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'pending')$q$);

reset role;
reset request.jwt.claims;

-- -----------------------------------------------------------------------------
-- Real side effects of a genuine insert: exactly one row, correct status,
-- and the AFTER INSERT notification trigger fires for the receiving
-- business. Run as postgres (bypasses RLS) purely to observe the result of
-- a real insert executed as creator_B, same as above but NOT rolled back,
-- so the notification and row count can actually be inspected.
-- -----------------------------------------------------------------------------
reset role;

do $$
declare
  v_app_id uuid;
  v_app_count int;
  v_notif_count int;
begin
  set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
  set local role authenticated;

  insert into public.applications (experience_id, slot_id, creator_id, business_id, status, message)
  values ('ffffffff-0000-0000-0000-000000000001', null,
          '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444',
          'pending', 'Candidatura reale per verificare gli effetti collaterali.')
  returning id into v_app_id;

  reset role;

  select count(*) into v_app_count
  from public.applications
  where experience_id = 'ffffffff-0000-0000-0000-000000000001'
    and creator_id = '33333333-3333-3333-3333-333333333333';

  insert into testing.results (role_under_test, test_name, kind, expected, actual, passed)
  values ('creator_B', 'insert creates exactly one application row', 'ALLOW/SCOPE',
          '1', v_app_count::text, v_app_count = 1);

  insert into testing.results (role_under_test, test_name, kind, expected, actual, passed)
  select 'creator_B', 'new application has status pending', 'ALLOW/SCOPE',
         'pending', status, status = 'pending'
  from public.applications where id = v_app_id;

  select count(*) into v_notif_count
  from public.notifications
  where user_id = '44444444-4444-4444-4444-444444444444'
    and type = 'application_received'
    and (payload->>'application_id')::uuid = v_app_id;

  insert into testing.results (role_under_test, test_name, kind, expected, actual, passed)
  values ('creator_B', 'notification trigger fires for the receiving business', 'ALLOW/SCOPE',
          '1', v_notif_count::text, v_notif_count = 1);

  -- Clean up: this is the only test file that does not roll back its write
  -- (needed to observe the trigger's real side effect), so undo it manually
  -- to keep fixture state pristine for any test file run after this one.
  delete from public.notifications where (payload->>'application_id')::uuid = v_app_id;
  delete from public.applications where id = v_app_id;
end $$;
