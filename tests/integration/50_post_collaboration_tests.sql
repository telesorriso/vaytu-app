-- =============================================================================
-- VAYTU — Targeted POST-COLLABORATION security tests (FASE 13 / FASE 15)
-- =============================================================================
-- The 6 role files (10–40) cover baseline table-by-table RLS. This file covers
-- the specific rules the Post-Collaboration milestone depends on, which are
-- enforced by CONSTRAINTS and TRIGGERS as much as by RLS:
--
--   REVIEWS       one per reviewer per collaboration, rating 1–5, reviewer is
--                 not the reviewee, only participants can write or read.
--   SUBMISSIONS   a Creator can only submit on their OWN collaboration.
--   BUSINESS      Business A cannot read Business B's reporting inputs
--                 (applications / collaborations / content_submissions), which
--                 is what makes the dashboard and Experience report isolated.
--   NOTIFICATIONS a user reads and updates only their own rows.
--   PROFILES      admin_notes and private onboarding evidence stay invisible.
--
-- Unlike files 10–40 this one exercises several identities, so it is grouped
-- into role blocks. The role argument passed to the testing.expect_* helpers
-- is only a LABEL for the results table: the identity that actually applies is
-- the one set by `set request.jwt.claims` + `set role authenticated` above each
-- block, and it must be re-established with `reset role` before every switch.
--
-- Helper choice matters:
--   expect_denied()   passes only on SQLSTATE 42501 — use for RLS/GRANT denials.
--   expect_rejected() passes on any error — use where a CHECK (23514) or
--                     UNIQUE (23505) constraint is the thing doing the refusing.
--
-- Fixture recap (from 01_seed_fixtures.sql):
--   creator_A  22222222… — application ...001 to business_A, still PENDING,
--                          therefore NO collaboration exists for creator_A.
--   creator_B  33333333… — collaboration (via application ...002) COMPLETED,
--                          already reviewed business_B once.
--   business_A 44444444… / business_B 55555555…
-- =============================================================================

\set ON_ERROR_STOP on

-- =============================================================================
-- creator_A — a Creator with NO collaboration: the outsider's view
-- =============================================================================
reset role;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set role authenticated;

-- REVIEWS: cannot read a review between two other parties.
select testing.expect_denied_select(
  'creator_A', 'review: non-participant cannot read another pair''s review',
  $q$select 1 from public.reviews where id = '77777777-aaaa-0000-0000-000000000001'$q$
);

-- REVIEWS: cannot review a collaboration they are not part of.
select testing.expect_denied(
  'creator_A', 'review: cannot review a collaboration you are not part of',
  $q$insert into public.reviews (collaboration_id, reviewer_id, reviewee_id, review_type, rating)
     select c.id, '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555',
            'creator_to_business', 5
     from public.collaborations c
     where c.application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

-- REVIEWS: cannot write a review signed as somebody else.
select testing.expect_rejected(
  'creator_A', 'review: cannot write a review as another user',
  $q$insert into public.reviews (collaboration_id, reviewer_id, reviewee_id, review_type, rating)
     select c.id, '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555',
            'creator_to_business', 1
     from public.collaborations c
     where c.application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

-- SUBMISSIONS: cannot read another creator's submission.
select testing.expect_denied_select(
  'creator_A', 'submission: other creator cannot read it',
  $q$select 1 from public.content_submissions where id = '55555555-aaaa-0000-0000-000000000001'$q$
);

-- SUBMISSIONS: the exact attack the submission form must be safe against —
-- posting content onto someone else's collaboration.
select testing.expect_denied(
  'creator_A', 'submission: cannot submit on another creator''s collaboration',
  $q$insert into public.content_submissions
       (deliverable_id, collaboration_id, creator_id, business_id, content_url, platform)
     select '44444444-aaaa-0000-0000-000000000001', c.id,
            '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555',
            'https://instagram.com/p/intruso', 'instagram'
     from public.collaborations c
     where c.application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

-- ...and the same attack spoofing the victim's creator_id.
select testing.expect_denied(
  'creator_A', 'submission: cannot submit impersonating another creator',
  $q$insert into public.content_submissions
       (deliverable_id, collaboration_id, creator_id, business_id, content_url, platform)
     select '44444444-aaaa-0000-0000-000000000001', c.id,
            '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555',
            'https://instagram.com/p/spoof', 'instagram'
     from public.collaborations c
     where c.application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

-- NOTIFICATIONS: sees only their own rows.
select testing.expect_select_count(
  'creator_A', 'notifications: cannot read another user''s notifications',
  $q$select 1 from public.notifications
     where user_id <> '22222222-2222-2222-2222-222222222222'$q$,
  0
);

select testing.expect_denied(
  'creator_A', 'notifications: cannot mark another user''s notification as read',
  $q$update public.notifications
       set is_read = true, read_at = now()
       where user_id = '33333333-3333-3333-3333-333333333333'$q$
);

select testing.expect_denied(
  'creator_A', 'notifications: cannot delete another user''s notification',
  $q$delete from public.notifications
       where user_id = '33333333-3333-3333-3333-333333333333'$q$
);

-- Notifications are written by SECURITY DEFINER triggers only; a client must
-- never be able to forge one, not even for itself.
select testing.expect_denied(
  'creator_A', 'notifications: client cannot insert a notification',
  $q$insert into public.notifications (user_id, type, title, body)
     values ('22222222-2222-2222-2222-222222222222', 'system', 'Falso', 'Inserito dal client')$q$
);

-- PROFILES: internal admin notes stay internal.
select testing.expect_denied_select(
  'creator_A', 'profile: creator cannot read admin notes',
  $q$select 1 from public.admin_notes$q$
);

-- PROFILES: a peer Creator's private Insights evidence stays private.
select testing.expect_select_count(
  'creator_A', 'profile: creator cannot read another creator''s evidence',
  $q$select 1 from public.creator_metric_evidence
     where creator_id <> '22222222-2222-2222-2222-222222222222'$q$,
  0
);

-- =============================================================================
-- creator_B — the Creator inside the completed collaboration
-- =============================================================================
reset role;
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set role authenticated;

select testing.expect_select_count(
  'creator_B', 'review: reviewer sees own review',
  $q$select 1 from public.reviews where id = '77777777-aaaa-0000-0000-000000000001'$q$,
  1
);

-- DUPLICATE: creator_B already reviewed this collaboration; the unique
-- constraint reviews_one_per_collaboration_per_reviewer must reject a second.
select testing.expect_rejected(
  'creator_B', 'review: duplicate review on same collaboration is rejected',
  $q$insert into public.reviews (collaboration_id, reviewer_id, reviewee_id, review_type, rating)
     select c.id, '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555',
            'creator_to_business', 4
     from public.collaborations c
     where c.application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

-- Self-review is rejected by reviews_reviewer_not_reviewee.
select testing.expect_rejected(
  'creator_B', 'review: reviewer cannot equal reviewee',
  $q$insert into public.reviews (collaboration_id, reviewer_id, reviewee_id, review_type, rating)
     select c.id, '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
            'creator_to_business', 5
     from public.collaborations c
     where c.application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

select testing.expect_select_count(
  'creator_B', 'submission: owner sees own submission',
  $q$select 1 from public.content_submissions where id = '55555555-aaaa-0000-0000-000000000001'$q$,
  1
);

-- A Creator must not be able to sign off on their own deliverable.
select testing.expect_denied(
  'creator_B', 'submission: creator cannot approve their own content',
  $q$update public.content_submissions
       set status = 'approved'
       where id = '55555555-aaaa-0000-0000-000000000001'$q$
);

-- COLLABORATION UPDATE AUTHORIZATION (migration 010)
--
-- Before 010, collaborations_update_participant let EITHER participant update
-- the row. Verified against real PostgreSQL, a Creator could self-complete
-- (inflating their own completed_collaborations_count from 1 to 2) and could
-- repoint business_id and experience_id into another tenant, because the
-- WITH CHECK passed as long as creator_id still matched. 010 replaces that
-- policy with an owner-only one and adds a column/terminal-state guard.

-- A Creator no longer has UPDATE on collaborations at all.
select testing.expect_denied(
  'creator_B', 'collab update: creator cannot self-complete a collaboration',
  $q$update public.collaborations
       set status = 'completed'
       where application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

select testing.expect_denied(
  'creator_B', 'collab update: creator cannot cancel a collaboration',
  $q$update public.collaborations
       set status = 'cancelled'
       where application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

select testing.expect_denied(
  'creator_B', 'collab update: creator cannot set a collaboration to disputed',
  $q$update public.collaborations
       set status = 'disputed'
       where application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

-- The identity columns. business_id and experience_id were the two that
-- actually succeeded before 010, so these are regression tests for a proven
-- exploit, not hypotheticals.
select testing.expect_denied(
  'creator_B', 'collab update: creator cannot repoint business_id to another tenant',
  $q$update public.collaborations
       set business_id = '44444444-4444-4444-4444-444444444444'
       where application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

select testing.expect_denied(
  'creator_B', 'collab update: creator cannot repoint experience_id',
  $q$update public.collaborations
       set experience_id = 'ffffffff-0000-0000-0000-000000000001'
       where application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

select testing.expect_denied(
  'creator_B', 'collab update: creator cannot repoint creator_id',
  $q$update public.collaborations
       set creator_id = '22222222-2222-2222-2222-222222222222'
       where application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

select testing.expect_denied(
  'creator_B', 'collab update: creator cannot repoint application_id',
  $q$update public.collaborations
       set application_id = '33333333-aaaa-0000-0000-000000000001'
       where application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

-- A Creator must not be able to forge a collaboration either: INSERT is
-- admin-only, rows are created by fn_create_collaboration_on_acceptance.
select testing.expect_denied(
  'creator_B', 'collab insert: creator cannot create a collaboration from the client',
  $q$insert into public.collaborations (application_id, experience_id, creator_id, business_id, status)
     values ('33333333-aaaa-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000003',
             '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 'active')$q$
);

select testing.expect_denied(
  'creator_B', 'collab delete: creator cannot delete a collaboration',
  $q$delete from public.collaborations
       where application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

-- The completion counter is system-controlled (protect_creator_protected_fields).
select testing.expect_rejected(
  'creator_B', 'completion: creator cannot inflate their completed count',
  $q$update public.creator_profiles
       set completed_collaborations_count = 999
       where id = '33333333-3333-3333-3333-333333333333'$q$
);

-- =============================================================================
-- business_A — a Business with NO relationship to the collaboration above.
-- These are exactly the reads getBusinessOverviewStats / getExperienceReport
-- perform, so they are the isolation guarantee behind the new reporting pages.
-- =============================================================================
reset role;
set request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set role authenticated;

select testing.expect_denied_select(
  'business_A', 'review: other business cannot read business_B''s review',
  $q$select 1 from public.reviews where id = '77777777-aaaa-0000-0000-000000000001'$q$
);

select testing.expect_denied_select(
  'business_A', 'submission: other business cannot read it',
  $q$select 1 from public.content_submissions where id = '55555555-aaaa-0000-0000-000000000001'$q$
);

select testing.expect_denied_select(
  'business_A', 'reporting: cannot count another business''s applications',
  $q$select 1 from public.applications
     where business_id = '55555555-5555-5555-5555-555555555555'$q$
);

select testing.expect_denied_select(
  'business_A', 'reporting: cannot count another business''s collaborations',
  $q$select 1 from public.collaborations
     where business_id = '55555555-5555-5555-5555-555555555555'$q$
);

select testing.expect_denied_select(
  'business_A', 'reporting: cannot count another business''s content',
  $q$select 1 from public.content_submissions
     where business_id = '55555555-5555-5555-5555-555555555555'$q$
);

-- An unscoped read — the shape produced if a query ever forgets its
-- business_id filter — must still return nothing that belongs to others.
select testing.expect_select_count(
  'business_A', 'reporting: unscoped collaborations read returns only own rows',
  $q$select 1 from public.collaborations
     where business_id <> '44444444-4444-4444-4444-444444444444'$q$,
  0
);

-- The Experience report is keyed on an experience id: naming another
-- Business's experience explicitly must still yield nothing.
select testing.expect_denied_select(
  'business_A', 'experience report: cannot read another business''s experience applications',
  $q$select 1 from public.applications
     where experience_id = 'ffffffff-0000-0000-0000-000000000003'$q$
);

select testing.expect_select_count(
  'business_A', 'notifications: cannot read another user''s notifications',
  $q$select 1 from public.notifications
     where user_id <> '44444444-4444-4444-4444-444444444444'$q$,
  0
);

select testing.expect_denied_select(
  'business_A', 'profile: business cannot read admin notes',
  $q$select 1 from public.admin_notes$q$
);

-- A Business must never reach a Creator's private onboarding evidence
-- (Instagram Insights screenshots) or identity documents.
select testing.expect_denied_select(
  'business_A', 'profile: business cannot read creator metric evidence',
  $q$select 1 from public.creator_metric_evidence$q$
);

select testing.expect_denied_select(
  'business_A', 'profile: business cannot read creator verification documents',
  $q$select 1 from public.creator_verifications$q$
);

-- COLLABORATION UPDATE: a Business that does not own the row (migration 010).
select testing.expect_denied(
  'business_A', 'collab update: non-owner business cannot complete another business''s collaboration',
  $q$update public.collaborations
       set status = 'completed'
       where application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

select testing.expect_denied(
  'business_A', 'collab update: non-owner business cannot claim a collaboration',
  $q$update public.collaborations
       set business_id = '44444444-4444-4444-4444-444444444444'
       where application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

-- =============================================================================
-- business_B — the Business inside the completed collaboration
-- =============================================================================
reset role;
set request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
set role authenticated;

select testing.expect_select_count(
  'business_B', 'review: reviewee sees review about itself',
  $q$select 1 from public.reviews where id = '77777777-aaaa-0000-0000-000000000001'$q$,
  1
);

select testing.expect_select_count(
  'business_B', 'submission: counterpart business sees the submission',
  $q$select 1 from public.content_submissions where id = '55555555-aaaa-0000-0000-000000000001'$q$,
  1
);

-- Rating is constrained to 1–5 by reviews_rating_range.
select testing.expect_rejected(
  'business_B', 'review: rating above 5 is rejected',
  $q$insert into public.reviews (collaboration_id, reviewer_id, reviewee_id, review_type, rating)
     select c.id, '55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333',
            'business_to_creator', 9
     from public.collaborations c
     where c.application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

select testing.expect_rejected(
  'business_B', 'review: rating below 1 is rejected',
  $q$insert into public.reviews (collaboration_id, reviewer_id, reviewee_id, review_type, rating)
     select c.id, '55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333',
            'business_to_creator', 0
     from public.collaborations c
     where c.application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

-- The counterpart side of a completed collaboration IS allowed to review.
-- expect_allowed_write rolls this back so later assertions stay clean.
select testing.expect_allowed_write(
  'business_B', 'review: business may review creator on a completed collaboration',
  $q$insert into public.reviews (collaboration_id, reviewer_id, reviewee_id, review_type, rating, comment)
     select c.id, '55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333',
            'business_to_creator', 5, 'Collaborazione impeccabile.'
     from public.collaborations c
     where c.application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

select testing.expect_select_count(
  'business_B', 'reporting: unscoped applications read returns only own rows',
  $q$select 1 from public.applications
     where business_id <> '55555555-5555-5555-5555-555555555555'$q$,
  0
);

select testing.expect_denied_select(
  'business_B', 'profile: business cannot read creator metric evidence',
  $q$select 1 from public.creator_metric_evidence$q$
);

-- The owning Business is the one identity that may drive the status. The
-- fixture collaboration is already 'completed', so exercise the allowed write
-- on a non-terminal column; expect_allowed_write rolls it back.
select testing.expect_allowed_write(
  'business_B', 'collab update: owning business may update its own collaboration',
  $q$update public.collaborations
       set notes = 'Nota interna del business'
       where application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

-- ...but not repoint identity columns. The guard applies to the owner too:
-- this hole was reachable from either side before 010.
select testing.expect_denied(
  'business_B', 'collab update: owning business cannot repoint creator_id',
  $q$update public.collaborations
       set creator_id = '22222222-2222-2222-2222-222222222222'
       where application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

select testing.expect_denied(
  'business_B', 'collab update: owning business cannot repoint experience_id',
  $q$update public.collaborations
       set experience_id = 'ffffffff-0000-0000-0000-000000000001'
       where application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

-- COUNTER IDEMPOTENCY. fn_on_collaboration_completed increments only on the
-- transition INTO 'completed'. Without the terminal-state guard the owner
-- could cycle completed -> active -> completed and inflate the Creator's
-- counter once per cycle, so reopening a terminal collaboration is refused.
select testing.expect_denied(
  'business_B', 'completion: terminal collaboration cannot be reopened (counter idempotency)',
  $q$update public.collaborations
       set status = 'active'
       where application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

-- Re-completing an already-completed collaboration must not increment again.
-- The write itself is permitted (status is unchanged, so the terminal guard
-- does not fire) and the trigger's old.status check makes it a no-op.
select testing.expect_allowed_write(
  'business_B', 'completion: re-writing completed status does not re-increment',
  $q$update public.collaborations
       set status = 'completed'
       where application_id = '33333333-aaaa-0000-0000-000000000002'$q$
);

-- =============================================================================
-- admin — completion invariants (admin can read everything by policy)
-- =============================================================================
reset role;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set role authenticated;

-- collaborations.application_id is UNIQUE, so the acceptance trigger can never
-- produce a second collaboration for the same application.
select testing.expect_select_count(
  'admin', 'completion: exactly one collaboration per accepted application',
  $q$select 1 from public.collaborations
     where application_id = '33333333-aaaa-0000-0000-000000000002'$q$,
  1
);

-- The completion trigger incremented creator_B's protected counter.
select testing.expect_select_count(
  'admin', 'completion: completed_collaborations_count was incremented',
  $q$select 1 from public.creator_profiles
     where id = '33333333-3333-3333-3333-333333333333'
       and completed_collaborations_count >= 1$q$,
  1
);

-- Exact value, not just ">= 1". The fixture completes exactly one
-- collaboration for creator_B, and every attempt above to re-complete or
-- reopen it was either rejected or a no-op, so the counter must still be
-- exactly 1. Before migration 010 this read 2 after a creator self-complete.
select testing.expect_select_count(
  'admin', 'completion: counter is exactly 1 after all re-completion attempts',
  $q$select 1 from public.creator_profiles
     where id = '33333333-3333-3333-3333-333333333333'
       and completed_collaborations_count = 1$q$,
  1
);

-- The hardened policy set: participant UPDATE is gone, owner UPDATE is in.
select testing.expect_select_count(
  'admin', 'policy: collaborations_update_participant no longer exists',
  $q$select 1 from pg_policies
     where schemaname = 'public' and tablename = 'collaborations'
       and policyname = 'collaborations_update_participant'$q$,
  0
);

select testing.expect_select_count(
  'admin', 'policy: collaborations_update_business exists',
  $q$select 1 from pg_policies
     where schemaname = 'public' and tablename = 'collaborations'
       and policyname = 'collaborations_update_business'$q$,
  1
);

reset role;
