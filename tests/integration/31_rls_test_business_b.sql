-- =============================================================================
-- VAYTU — RLS EXECUTED TEST: role = business_B (55555555-...-5555)
-- =============================================================================
set request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
set role authenticated;

-- ALLOW: sees own data ----------------------------------------------------------
select testing.expect_select_count('business_B', 'sees own experience',
  $q$select * from public.experiences where business_id = '55555555-5555-5555-5555-555555555555'$q$, 1);

select testing.expect_select_count('business_B', 'sees own collaboration (creator_B)',
  $q$select * from public.collaborations where business_id = '55555555-5555-5555-5555-555555555555'$q$, 1);

select testing.expect_select_count('business_B', 'sees content_submission for its own collaboration',
  $q$select * from public.content_submissions where business_id = '55555555-5555-5555-5555-555555555555'$q$, 1);

select testing.expect_select_count('business_B', 'sees own review (as reviewee)',
  $q$select * from public.reviews where reviewee_id = '55555555-5555-5555-5555-555555555555'$q$, 1);

-- ALLOW: writes within own scope -------------------------------------------------
select testing.expect_allowed_write('business_B', 'can review a submitted content_submission',
  $q$update public.content_submissions set status = 'approved',
       reviewed_by = '55555555-5555-5555-5555-555555555555', reviewed_at = now()
     where id = '55555555-aaaa-0000-0000-000000000001' and business_id = '55555555-5555-5555-5555-555555555555'$q$);

select testing.expect_allowed_write('business_B', 'can create a deliverable on its own collaboration',
  $q$insert into public.collaboration_deliverables (collaboration_id, deliverable_type, status)
     select id, 'instagram_story', 'pending' from public.collaborations
     where business_id = '55555555-5555-5555-5555-555555555555' limit 1$q$);

-- DENY: cannot see or touch business_A's resources --------------------------------
select testing.expect_denied_select('business_B', 'cannot see business_A''s draft experience',
  $q$select * from public.experiences where id = 'ffffffff-0000-0000-0000-000000000002'$q$);

select testing.expect_denied_select('business_B', 'cannot see business_A''s applications',
  $q$select * from public.applications where business_id = '44444444-4444-4444-4444-444444444444'$q$);

select testing.expect_denied('business_B', 'cannot update business_A''s published experience',
  $q$update public.experiences set title = 'hijacked' where id = 'ffffffff-0000-0000-0000-000000000001'$q$);

select testing.expect_denied('business_B', 'cannot decide on business_A''s application',
  $q$update public.applications set status = 'accepted'
     where id = '33333333-aaaa-0000-0000-000000000001'$q$);

-- DENY: never sees creator private evidence / admin data --------------------------
select testing.expect_denied_select('business_B', 'cannot see creator_metric_evidence',
  $q$select * from public.creator_metric_evidence$q$);

select testing.expect_denied_select('business_B', 'cannot see creator_verifications',
  $q$select * from public.creator_verifications$q$);

select testing.expect_denied_select('business_B', 'cannot see admin_notes',
  $q$select * from public.admin_notes$q$);

select testing.expect_denied_select('business_B', 'cannot see audit_log',
  $q$select * from public.audit_log$q$);

select testing.expect_denied('business_B', 'cannot insert an admin_note',
  $q$insert into public.admin_notes (target_table, target_id, author_id, note)
     values ('business_profiles', '55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'self note')$q$);

reset role;
reset request.jwt.claims;
