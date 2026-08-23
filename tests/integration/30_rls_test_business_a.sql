-- =============================================================================
-- VAYTU — RLS EXECUTED TEST: role = business_A (44444444-...-4444)
-- =============================================================================
set request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set role authenticated;

-- ALLOW: sees own data, including own draft experience ------------------------
select testing.expect_select_count('business_A', 'sees own experiences (published + draft)',
  $q$select * from public.experiences where business_id = '44444444-4444-4444-4444-444444444444'$q$, 2);

select testing.expect_select_count('business_A', 'sees own draft experience specifically',
  $q$select * from public.experiences where id = 'ffffffff-0000-0000-0000-000000000002'$q$, 1);

select testing.expect_select_count('business_A', 'sees own application (creator_A -> its experience)',
  $q$select * from public.applications where business_id = '44444444-4444-4444-4444-444444444444'$q$, 1);

select testing.expect_select_count('business_A', 'sees creator_A metrics (necessary vetting data)',
  $q$select * from public.creator_metrics where creator_id = '22222222-2222-2222-2222-222222222222'$q$, 1);

select testing.expect_select_count('business_A', 'sees own business_verifications',
  $q$select * from public.business_verifications where business_id = '44444444-4444-4444-4444-444444444444'$q$, 1);

-- ALLOW: writes within own scope ------------------------------------------------
select testing.expect_allowed_write('business_A', 'can update own experience',
  $q$update public.experiences set description = 'Descrizione aggiornata.' where id = 'ffffffff-0000-0000-0000-000000000001'$q$);

select testing.expect_allowed_write('business_A', 'can insert a new slot on own experience',
  $q$insert into public.experience_slots (experience_id, start_date, end_date, capacity)
     values ('ffffffff-0000-0000-0000-000000000001', '2026-10-01', '2026-10-03', 1)$q$);

select testing.expect_allowed_write('business_A', 'can accept a pending application to its own experience',
  $q$update public.applications set status = 'accepted', decided_by = '44444444-4444-4444-4444-444444444444'
     where id = '33333333-aaaa-0000-0000-000000000001' and business_id = '44444444-4444-4444-4444-444444444444'$q$);

-- DENY: cannot see or touch creator's private evidence/verification data -------
select testing.expect_denied_select('business_A', 'cannot see creator_metric_evidence (raw Insights screenshots)',
  $q$select * from public.creator_metric_evidence$q$);

select testing.expect_denied_select('business_A', 'cannot see creator_verifications (verification evidence)',
  $q$select * from public.creator_verifications$q$);

select testing.expect_denied_select('business_A', 'cannot see admin_notes',
  $q$select * from public.admin_notes$q$);

select testing.expect_denied_select('business_A', 'cannot see audit_log',
  $q$select * from public.audit_log$q$);

-- DENY: cannot manage business_B's experiences/applications/collaborations -----
select testing.expect_denied_select('business_A', 'cannot see business_B''s applications',
  $q$select * from public.applications where business_id = '55555555-5555-5555-5555-555555555555'$q$);

select testing.expect_denied('business_A', 'cannot update business_B''s experience',
  $q$update public.experiences set title = 'hijacked' where id = 'ffffffff-0000-0000-0000-000000000003'$q$);

select testing.expect_denied('business_A', 'cannot decide on business_B''s application',
  $q$update public.applications set status = 'rejected'
     where business_id = '55555555-5555-5555-5555-555555555555'$q$);

select testing.expect_denied('business_A', 'cannot insert an experience_slot on business_B''s experience',
  $q$insert into public.experience_slots (experience_id, start_date, end_date, capacity)
     values ('ffffffff-0000-0000-0000-000000000003', '2026-10-01', '2026-10-02', 1)$q$);

-- (business_A's verification_status is already 'verified' from fixture seeding;
-- assert against 'rejected' so this is a genuine attempted change, not a no-op.)
select testing.expect_denied('business_A', 'cannot self-change its own verification_status',
  $q$update public.business_profiles set verification_status = 'rejected' where id = '44444444-4444-4444-4444-444444444444'$q$);

select testing.expect_denied('business_A', 'cannot insert directly into audit_log',
  $q$insert into public.audit_log (actor_id, action, table_name, record_id)
     values ('44444444-4444-4444-4444-444444444444', 'update', 'experiences', 'ffffffff-0000-0000-0000-000000000001')$q$);

reset role;
reset request.jwt.claims;
