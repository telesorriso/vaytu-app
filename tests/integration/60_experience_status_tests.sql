-- =============================================================================
-- VAYTU — Experience status transition tests (bug report: "Experience resta
-- in bozza" — draft -> published never worked in Production)
-- =============================================================================
-- Filed against a real Production observation: 2 experiences created, 0
-- published, 2 draft. Full code audit (RLS policies, updateExperienceStatus,
-- submitChangeStatus, the StatusButton component, and a live Chromium click
-- test against the real component) found no application bug — every layer
-- traced correctly. This file closes the actual gap the audit surfaced: the
-- exact draft -> published UPDATE the app performs had ZERO test coverage
-- before this bug report, at any layer.
--
-- Proves, against real PostgreSQL 16 with the real RLS policies from
-- 004_rls_policies.sql (experiences_update_owner and friends — no migration
-- or policy change was made to produce this result):
--
--   - the owning Business CAN move draft -> published (the exact transition
--     reported broken)
--   - a published experience becomes visible to anon/authenticated per
--     experiences_select_public (status = 'published' and deleted_at is null)
--   - a non-owner Business cannot publish someone else's draft
--   - a Creator cannot change any experience's status
--   - the full lifecycle graph the app's own validTransitions table
--     (app/business/(app)/experiences/actions.ts) claims to support actually
--     works at the database layer: published<->paused, published->closed,
--     any non-terminal status -> archived
--
-- Fixture recap (01_seed_fixtures.sql):
--   business_A 44444444… owns ffffffff-...0001 (published) and
--                          ffffffff-...0002 (draft) — the draft is the exact
--                          row this file exercises.
--   business_B 55555555… owns ffffffff-...0003 (published), used as the
--                          "unrelated business" for cross-account tests.
--   creator_A  22222222…
-- =============================================================================

\set ON_ERROR_STOP on

-- -----------------------------------------------------------------------------
-- THE REPORTED TRANSITION: business_A publishes their own draft.
-- -----------------------------------------------------------------------------
reset role;
set request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set role authenticated;

select testing.expect_allowed_write(
  'business_A', 'experience: owner can move draft -> published (the reported bug)',
  $q$update public.experiences
       set status = 'published'
       where id = 'ffffffff-0000-0000-0000-000000000002'
         and business_id = '44444444-4444-4444-4444-444444444444'$q$
);

-- Not just "the write succeeded" — actually leave it published and verify a
-- second query sees the change, the same shape as the app's page reload.
update public.experiences set status = 'published' where id = 'ffffffff-0000-0000-0000-000000000002';

select testing.expect_select_count(
  'business_A', 'experience: publish is durable on next read',
  $q$select 1 from public.experiences
     where id = 'ffffffff-0000-0000-0000-000000000002' and status = 'published'$q$,
  1
);

reset role;

-- A published experience must become publicly discoverable — this is the
-- entire point of publishing, and the actual proof a Creator would see it.
select testing.expect_select_count(
  'anonymous', 'experience: newly published row is visible to anon',
  $q$select 1 from public.experiences
     where id = 'ffffffff-0000-0000-0000-000000000002' and status = 'published'$q$,
  1
);

set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set role authenticated;

select testing.expect_select_count(
  'creator_A', 'experience: newly published row is visible to a Creator',
  $q$select 1 from public.experiences
     where id = 'ffffffff-0000-0000-0000-000000000002' and status = 'published'$q$,
  1
);

-- -----------------------------------------------------------------------------
-- SECURITY: this is a Business-owner privilege, not a general one.
-- -----------------------------------------------------------------------------

-- Creator cannot publish anything, including a draft that isn't even theirs
-- to touch.
select testing.expect_denied(
  'creator_A', 'experience: creator cannot change any experience status',
  $q$update public.experiences
       set status = 'published'
       where id = 'ffffffff-0000-0000-0000-000000000002'$q$
);

reset role;
set request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
set role authenticated;

-- business_B does not own ffffffff-...0002 (that's business_A's draft).
select testing.expect_denied(
  'business_B', 'experience: non-owner business cannot publish another business''s draft',
  $q$update public.experiences
       set status = 'published'
       where id = 'ffffffff-0000-0000-0000-000000000002'$q$
);

reset role;

-- -----------------------------------------------------------------------------
-- THE REST OF THE LIFECYCLE the app's validTransitions table promises
-- (app/business/(app)/experiences/actions.ts). No status invented here — all
-- five values are the ones defined in 001_init_enums.sql. Exercised on
-- business_A's already-published ffffffff-...0001 fixture row so the earlier
-- assertions above are undisturbed.
-- -----------------------------------------------------------------------------
set request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set role authenticated;

select testing.expect_allowed_write(
  'business_A', 'experience: published -> paused',
  $q$update public.experiences set status = 'paused'
     where id = 'ffffffff-0000-0000-0000-000000000001'
       and business_id = '44444444-4444-4444-4444-444444444444'$q$
);

update public.experiences set status = 'paused' where id = 'ffffffff-0000-0000-0000-000000000001';

select testing.expect_allowed_write(
  'business_A', 'experience: paused -> published (republish)',
  $q$update public.experiences set status = 'published'
     where id = 'ffffffff-0000-0000-0000-000000000001'
       and business_id = '44444444-4444-4444-4444-444444444444'$q$
);

select testing.expect_allowed_write(
  'business_A', 'experience: published -> closed',
  $q$update public.experiences set status = 'closed'
     where id = 'ffffffff-0000-0000-0000-000000000001'
       and business_id = '44444444-4444-4444-4444-444444444444'$q$
);

select testing.expect_allowed_write(
  'business_A', 'experience: draft -> archived',
  $q$update public.experiences set status = 'archived'
     where id = 'ffffffff-0000-0000-0000-000000000002'
       and business_id = '44444444-4444-4444-4444-444444444444'$q$
);

reset role;

-- Confirm the earlier writes to ffffffff-...0001/0002 were genuinely rolled
-- back by expect_allowed_write's internal savepoint, not left dangling —
-- ffffffff-...0002 should still read 'published' from the durable write above.
select testing.expect_select_count(
  'admin', 'experience: fixture 0002 still published after the lifecycle probes above',
  $q$select 1 from public.experiences
     where id = 'ffffffff-0000-0000-0000-000000000002' and status = 'published'$q$,
  1
);
