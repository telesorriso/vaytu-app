-- =============================================================================
-- VAYTU — RLS EXECUTED TEST: role = admin (11111111-...-1111)
-- =============================================================================
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set role authenticated;

-- ALLOW: full visibility across the platform -------------------------------------
select testing.expect_select_count('admin', 'sees all profiles (5)',
  $q$select * from public.profiles$q$, 5);

select testing.expect_select_count('admin', 'sees all creator_metric_evidence (private evidence)',
  $q$select * from public.creator_metric_evidence$q$, 1);

select testing.expect_select_count('admin', 'sees all creator_verifications',
  $q$select * from public.creator_verifications$q$, 1);

select testing.expect_select_count('admin', 'sees all business_verifications',
  $q$select * from public.business_verifications$q$, 1);

select testing.expect_select_count('admin', 'sees all admin_notes',
  $q$select * from public.admin_notes$q$, 1);

select testing.expect_select_count('admin', 'sees the audit_log',
  $q$select * from public.audit_log$q$, 13);

select testing.expect_select_count('admin', 'sees draft experiences too',
  $q$select * from public.experiences where status = 'draft'$q$, 1);

-- ALLOW: administrative functions ---------------------------------------------
select testing.expect_allowed_write('admin', 'can set a creator''s reliability_score',
  $q$update public.creator_profiles set reliability_score = 42 where id = '22222222-2222-2222-2222-222222222222'$q$);

select testing.expect_allowed_write('admin', 'can change a creator''s Vaytu Level',
  $q$update public.creator_profiles set current_level_id = 'aaaaaaaa-0000-0000-0000-000000000002' where id = '22222222-2222-2222-2222-222222222222'$q$);

select testing.expect_allowed_write('admin', 'can reject a creator verification',
  $q$update public.creator_verifications set status = 'rejected', reviewed_by = '11111111-1111-1111-1111-111111111111'
     where id = 'dddddddd-0000-0000-0000-000000000001'$q$);

select testing.expect_allowed_write('admin', 'can manage creator_levels reference data',
  $q$update public.creator_levels set description = 'Livello base' where code = 'bronze'$q$);

select testing.expect_allowed_write('admin', 'can insert an admin_note on any entity',
  $q$insert into public.admin_notes (target_table, target_id, author_id, note)
     values ('experiences', 'ffffffff-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'controllo admin')$q$);

select testing.expect_allowed_write('admin', 'can suspend a profile (is_active)',
  $q$update public.profiles set is_active = false where id = '33333333-3333-3333-3333-333333333333'$q$);

-- DENY: audit_log is never client-writable, not even by admin ---------------------
select testing.expect_denied('admin', 'cannot insert directly into audit_log (no client role may)',
  $q$insert into public.audit_log (actor_id, action, table_name, record_id)
     values ('11111111-1111-1111-1111-111111111111', 'insert', 'profiles', '11111111-1111-1111-1111-111111111111')$q$);

select testing.expect_denied('admin', 'cannot update audit_log rows',
  $q$update public.audit_log set table_name = 'tampered'$q$);

select testing.expect_denied('admin', 'cannot delete audit_log rows',
  $q$delete from public.audit_log$q$);

reset role;
reset request.jwt.claims;
