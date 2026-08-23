-- =============================================================================
-- VAYTU — RLS EXECUTED TEST: role = creator_B (33333333-...-3333)
-- =============================================================================
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set role authenticated;

-- ALLOW: sees own data --------------------------------------------------------
select testing.expect_select_count('creator_B', 'sees own profile',
  $q$select * from public.profiles where id = '33333333-3333-3333-3333-333333333333'$q$, 1);

select testing.expect_select_count('creator_B', 'sees own collaboration (auto-created + completed)',
  $q$select * from public.collaborations where creator_id = '33333333-3333-3333-3333-333333333333'$q$, 1);

select testing.expect_select_count('creator_B', 'sees own collaboration_deliverable',
  $q$select * from public.collaboration_deliverables cd
     join public.collaborations c on c.id = cd.collaboration_id
     where c.creator_id = '33333333-3333-3333-3333-333333333333'$q$, 1);

select testing.expect_select_count('creator_B', 'sees own content_submission',
  $q$select * from public.content_submissions where creator_id = '33333333-3333-3333-3333-333333333333'$q$, 1);

select testing.expect_select_count('creator_B', 'sees own submission_metrics',
  $q$select * from public.submission_metrics sm
     join public.content_submissions cs on cs.id = sm.submission_id
     where cs.creator_id = '33333333-3333-3333-3333-333333333333'$q$, 1);

select testing.expect_select_count('creator_B', 'sees own review (as reviewer)',
  $q$select * from public.reviews where reviewer_id = '33333333-3333-3333-3333-333333333333'$q$, 1);

-- ALLOW: writes within own scope ----------------------------------------------
select testing.expect_allowed_write('creator_B', 'can update own content_submission caption before review',
  $q$update public.content_submissions set caption = 'Che weekend fantastico!'
     where id = '55555555-aaaa-0000-0000-000000000001' and creator_id = '33333333-3333-3333-3333-333333333333'$q$);

select testing.expect_allowed_write('creator_B', 'can edit own existing review',
  $q$update public.reviews set comment = 'aggiornata dal creator' where reviewer_id = '33333333-3333-3333-3333-333333333333'$q$);

-- DENY: cannot see creator_A's private data ------------------------------------
select testing.expect_denied_select('creator_B', 'cannot see creator_A''s creator_profile',
  $q$select * from public.creator_profiles where id = '22222222-2222-2222-2222-222222222222'$q$);

select testing.expect_denied_select('creator_B', 'cannot see creator_A''s creator_metric_evidence',
  $q$select * from public.creator_metric_evidence where creator_id = '22222222-2222-2222-2222-222222222222'$q$);

select testing.expect_denied_select('creator_B', 'cannot see creator_A''s application',
  $q$select * from public.applications where id = '33333333-aaaa-0000-0000-000000000001'$q$);

select testing.expect_denied_select('creator_B', 'cannot see admin_notes',
  $q$select * from public.admin_notes$q$);

select testing.expect_denied_select('creator_B', 'cannot see audit_log',
  $q$select * from public.audit_log$q$);

select testing.expect_denied_select('creator_B', 'cannot see creator_A''s notifications',
  $q$select * from public.notifications where user_id = '22222222-2222-2222-2222-222222222222'$q$);

-- DENY: cannot touch other collaboration parties' data or protected fields ------
select testing.expect_denied('creator_B', 'cannot modify own reliability_score',
  $q$update public.creator_profiles set reliability_score = 50 where id = '33333333-3333-3333-3333-333333333333'$q$);

select testing.expect_denied('creator_B', 'cannot approve its own content_submission',
  $q$update public.content_submissions set status = 'approved'
     where id = '55555555-aaaa-0000-0000-000000000001' and creator_id = '33333333-3333-3333-3333-333333333333'$q$);
  -- allowed by creator UPDATE policy (USING creator_id + status='pending_review') but the
  -- WITH CHECK still requires status='pending_review', so setting it to 'approved' must fail.

select testing.expect_denied('creator_B', 'cannot write a review impersonating another reviewer',
  $q$insert into public.reviews (collaboration_id, reviewer_id, reviewee_id, review_type, rating, comment)
     select id, '22222222-2222-2222-2222-222222222222', business_id, 'creator_to_business', 5, 'spoofed'
     from public.collaborations where creator_id = '33333333-3333-3333-3333-333333333333' limit 1$q$);

select testing.expect_denied('creator_B', 'cannot delete admin_notes',
  $q$delete from public.admin_notes$q$);

reset role;
reset request.jwt.claims;
