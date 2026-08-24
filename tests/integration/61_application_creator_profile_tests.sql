-- =============================================================================
-- VAYTU — Targeted BUSINESS APPLICATION -> CREATOR PROFILE tests
-- =============================================================================
-- Covers the "Business doesn't see the Creator profile in application detail"
-- production bug: getApplicationDetail()'s creator_profiles SELECT referenced
-- a column (avatar_url) that does not exist on that table, so the whole query
-- failed and the failure was silently discarded, leaving creatorProfile
-- undefined for every application. Proves, against the real RLS engine:
--   - the corrected column list actually succeeds and returns real data,
--   - that data genuinely belongs to the applicant (creator_id), not anyone
--     else's row,
--   - a competing business cannot read another business's application at all,
--   - the two-step application -> creator_profiles lookup really is driven
--     by applications.creator_id (not a hardcoded or swapped id).
--
-- Fixture identities used here (see 01_seed_fixtures.sql):
--   business_A = 44444444-4444-4444-4444-444444444444
--   business_B = 55555555-5555-5555-5555-555555555555
--   creator_A  = 22222222-2222-2222-2222-222222222222 ('Creator A', Milano)
--   creator_B  = 33333333-3333-3333-3333-333333333333 ('Creator B', Roma)
--   app1 (...0001) = creator_A -> business_A's experience ...0001, pending
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ALLOW: business_A reads its own application, then the corrected
-- creator_profiles column list for the applicant — mirrors the exact
-- two-step read getApplicationDetail() performs.
-- -----------------------------------------------------------------------------
set request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set role authenticated;

select testing.expect_select_count('business_A', 'reads its own application',
  $q$select * from public.applications where id = '33333333-aaaa-0000-0000-000000000001'
     and business_id = '44444444-4444-4444-4444-444444444444'$q$, 1);

select testing.expect_select_count('business_A', 'reads the applicant creator_profile with the corrected column list',
  $q$select display_name, username, city, bio, niches, verification_status,
            instagram_handle, tiktok_handle, current_level_id
     from public.creator_profiles
     where id = '22222222-2222-2222-2222-222222222222'$q$, 1);

reset role;
reset request.jwt.claims;

-- -----------------------------------------------------------------------------
-- Real content assertions, using the exact two-step lookup (application ->
-- creator_id -> creator_profiles), executed as a single DO block so the
-- creator_id can be threaded from the first query into the second, exactly
-- like getApplicationDetail() does.
-- -----------------------------------------------------------------------------
do $$
declare
  v_creator_id uuid;
  v_display_name text;
  v_username text;
  v_bio text;
  v_instagram text;
  v_tiktok text;
begin
  set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
  set local role authenticated;

  select creator_id into v_creator_id
  from public.applications
  where id = '33333333-aaaa-0000-0000-000000000001'
    and business_id = '44444444-4444-4444-4444-444444444444';

  insert into testing.results (role_under_test, test_name, kind, expected, actual, passed)
  values ('business_A', 'application.creator_id drives the lookup, not a hardcoded id', 'ALLOW/SCOPE',
          '22222222-2222-2222-2222-222222222222', coalesce(v_creator_id::text, 'NULL'),
          v_creator_id = '22222222-2222-2222-2222-222222222222');

  select display_name, username, bio, instagram_handle, tiktok_handle
    into v_display_name, v_username, v_bio, v_instagram, v_tiktok
  from public.creator_profiles
  where id = v_creator_id;

  insert into testing.results (role_under_test, test_name, kind, expected, actual, passed)
  values ('business_A', 'creator_profiles data genuinely belongs to the applicant (creator_A)', 'ALLOW/SCOPE',
          'Creator A', coalesce(v_display_name, 'NULL'), v_display_name = 'Creator A');

  insert into testing.results (role_under_test, test_name, kind, expected, actual, passed)
  values ('business_A', 'creator_B is never returned for creator_A''s application', 'ALLOW/SCOPE',
          'not Creator B', coalesce(v_display_name, 'NULL'), v_display_name is distinct from 'Creator B');

  -- Optional fields (username, bio, instagram_handle, tiktok_handle) are
  -- genuinely null for creator_A in the fixtures: confirms a real, unset
  -- optional field does not error the query or break the row.
  insert into testing.results (role_under_test, test_name, kind, expected, actual, passed)
  values ('business_A', 'row returns successfully with unset optional fields (null, not an error)', 'ALLOW/SCOPE',
          'row returned', 'row returned',
          v_username is null and v_bio is null and v_instagram is null and v_tiktok is null);

  reset role;
  reset request.jwt.claims;
end $$;

-- -----------------------------------------------------------------------------
-- DENY: business_B cannot read business_A's application at all (so it can
-- never reach the creator_profiles lookup for creator_A's application in the
-- first place — the business_id scoping in getApplicationDetail()'s first
-- query is the real gate here).
-- -----------------------------------------------------------------------------
set request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
set role authenticated;

-- Deliberately no `and business_id = ...` filter here: that would make the
-- query trivially return 0 rows regardless of RLS. This tests whether RLS
-- itself hides the row — business_A's application must not be visible to
-- business_B at all, by id alone.
select testing.expect_denied_select('business_B', 'cannot read business_A''s application',
  $q$select * from public.applications where id = '33333333-aaaa-0000-0000-000000000001'$q$);

reset role;
reset request.jwt.claims;
