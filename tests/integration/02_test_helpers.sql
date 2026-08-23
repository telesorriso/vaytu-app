-- =============================================================================
-- VAYTU — LOCAL TEST HARNESS ONLY: assertion helpers
-- =============================================================================
-- schema `testing` is NOT part of the product schema, has NO RLS enabled,
-- and exists purely to record real ALLOW/DENY test outcomes as each test
-- file executes real SQL under a real simulated Postgres role + JWT claim.
-- =============================================================================

create schema if not exists testing;

create table if not exists testing.results (
  id               bigserial primary key,
  role_under_test  text not null,
  test_name        text not null,
  kind             text not null, -- 'ALLOW' | 'DENY'
  expected         text not null,
  actual           text not null,
  passed           boolean not null,
  detail           text,
  created_at       timestamptz not null default now()
);

grant usage on schema testing to anon, authenticated, service_role;
grant select, insert on testing.results to anon, authenticated, service_role;
grant usage, select on all sequences in schema testing to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- expect_select_count: ALLOW/scoping test — runs p_query as the currently
-- active role and asserts the row count matches exactly.
-- -----------------------------------------------------------------------------
create or replace function testing.expect_select_count(
  p_role text, p_test_name text, p_query text, p_expected int
) returns void
language plpgsql
as $$
declare
  v_actual int;
begin
  execute 'select count(*) from (' || p_query || ') t' into v_actual;
  insert into testing.results (role_under_test, test_name, kind, expected, actual, passed)
  values (p_role, p_test_name, 'ALLOW/SCOPE', p_expected::text, v_actual::text, v_actual = p_expected);
exception when others then
  insert into testing.results (role_under_test, test_name, kind, expected, actual, passed, detail)
  values (p_role, p_test_name, 'ALLOW/SCOPE', p_expected::text, 'ERROR', false, sqlerrm);
end;
$$;

-- -----------------------------------------------------------------------------
-- expect_allowed_write: ALLOW test for INSERT/UPDATE/DELETE — asserts the
-- statement succeeds AND affects at least one row. The write is executed for
-- real against the real RLS engine, then always unwound (via a deliberate
-- marker exception, forcing an implicit ROLLBACK TO SAVEPOINT) so fixture
-- data stays pristine for every other test file, regardless of outcome.
-- -----------------------------------------------------------------------------
create or replace function testing.expect_allowed_write(
  p_role text, p_test_name text, p_sql text
) returns void
language plpgsql
as $$
declare
  v_rows int;
  v_ok boolean;
begin
  begin
    execute p_sql;
    get diagnostics v_rows = row_count;
    v_ok := v_rows > 0;
    raise exception using errcode = 'VT002', message = 'vaytu_test_cleanup_rollback';
  exception
    when sqlstate 'VT002' then
      insert into testing.results (role_under_test, test_name, kind, expected, actual, passed, detail)
      values (
        p_role, p_test_name, 'ALLOW', '>=1 row affected',
        v_rows || ' row(s) affected (write rolled back after assertion)', v_ok,
        case when not v_ok then 'statement ran without error but affected 0 rows (silently scoped out)' end
      );
    when others then
      insert into testing.results (role_under_test, test_name, kind, expected, actual, passed, detail)
      values (p_role, p_test_name, 'ALLOW', '>=1 row affected', 'ERROR: ' || sqlerrm, false, sqlstate);
  end;
end;
$$;

-- -----------------------------------------------------------------------------
-- expect_denied: DENY test for INSERT/UPDATE/DELETE. Passes if either:
--   (a) Postgres raises the RLS violation error (42501) — typical for INSERT
--       and for UPDATE where WITH CHECK rejects the new row, or
--   (b) the statement runs without error but affects 0 rows — typical for
--       UPDATE/DELETE where USING makes the target row invisible.
-- Any effective mutation (rows actually changed) is treated as an
-- unexpected ALLOW (FAIL) and is neutralized via a raised marker error so
-- nothing persists past this function call.
-- -----------------------------------------------------------------------------
create or replace function testing.expect_denied(
  p_role text, p_test_name text, p_sql text
) returns void
language plpgsql
as $$
declare
  v_rows int;
begin
  begin
    execute p_sql;
    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      raise exception using errcode = 'VT001', message = 'vaytu_test_unexpected_success';
    end if;
    insert into testing.results (role_under_test, test_name, kind, expected, actual, passed)
    values (p_role, p_test_name, 'DENY', 'denied', 'denied (0 rows affected)', true);
  exception
    when sqlstate '42501' then
      insert into testing.results (role_under_test, test_name, kind, expected, actual, passed, detail)
      values (p_role, p_test_name, 'DENY', 'denied', 'denied (RLS policy violation)', true, sqlerrm);
    when others then
      if sqlstate = 'VT001' then
        insert into testing.results (role_under_test, test_name, kind, expected, actual, passed, detail)
        values (p_role, p_test_name, 'DENY', 'denied', 'ALLOWED (unexpected, ' || v_rows || ' row(s))', false, 'write should have been denied but succeeded');
      else
        insert into testing.results (role_under_test, test_name, kind, expected, actual, passed, detail)
        values (p_role, p_test_name, 'DENY', 'denied', 'unexpected error: ' || sqlerrm, false, sqlstate);
      end if;
  end;
end;
$$;

-- -----------------------------------------------------------------------------
-- expect_denied_select: DENY test for SELECT visibility — asserts a row that
-- exists (seeded by the fixtures) is NOT visible to the current role.
-- Denial can happen at two gates, both count as PASS:
--   (a) the outer table-level GRANT gate (SQLSTATE 42501, "permission denied
--       for table ..."), e.g. anon has no grant at all on public.profiles; or
--   (b) the inner RLS gate — the statement succeeds but returns 0 rows.
-- Any other outcome (a different error, or >0 rows visible) is a FAIL.
-- -----------------------------------------------------------------------------
create or replace function testing.expect_denied_select(
  p_role text, p_test_name text, p_query text
) returns void
language plpgsql
as $$
declare
  v_actual int;
begin
  execute 'select count(*) from (' || p_query || ') t' into v_actual;
  insert into testing.results (role_under_test, test_name, kind, expected, actual, passed)
  values (p_role, p_test_name, 'DENY', '0 rows visible', v_actual || ' row(s) visible', v_actual = 0);
exception
  when sqlstate '42501' then
    insert into testing.results (role_under_test, test_name, kind, expected, actual, passed, detail)
    values (p_role, p_test_name, 'DENY', '0 rows visible', 'denied (no table-level privilege)', true, sqlerrm);
  when others then
    insert into testing.results (role_under_test, test_name, kind, expected, actual, passed, detail)
    values (p_role, p_test_name, 'DENY', '0 rows visible', 'ERROR', false, sqlerrm);
end;
$$;

-- -----------------------------------------------------------------------------
-- expect_rejected — the database must REFUSE this write, by any mechanism
-- -----------------------------------------------------------------------------
-- expect_denied() deliberately only accepts SQLSTATE 42501 (insufficient
-- privilege), because for the per-role RLS files "denied" specifically means
-- "RLS/GRANT stopped it". Some invariants are instead enforced by CHECK or
-- UNIQUE constraints and legitimately fail with 23514 / 23505 — a duplicate
-- review, a rating outside 1..5, a self-review. Those are still "the database
-- refused", so they need a helper that treats any error, or a zero-row write,
-- as a pass. Only a write that actually succeeds is a failure.
create or replace function testing.expect_rejected(
  p_role text, p_test_name text, p_sql text
) returns void
language plpgsql
as $$
declare
  v_rows int;
begin
  begin
    execute p_sql;
    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      raise exception using errcode = 'VT001', message = 'vaytu_test_unexpected_success';
    end if;
    insert into testing.results (role_under_test, test_name, kind, expected, actual, passed)
    values (p_role, p_test_name, 'REJECT', 'rejected', 'rejected (0 rows affected)', true);
  exception
    when others then
      if sqlstate = 'VT001' then
        insert into testing.results (role_under_test, test_name, kind, expected, actual, passed, detail)
        values (p_role, p_test_name, 'REJECT', 'rejected',
                'ALLOWED (unexpected, ' || v_rows || ' row(s))', false,
                'write should have been rejected but succeeded');
      else
        insert into testing.results (role_under_test, test_name, kind, expected, actual, passed, detail)
        values (p_role, p_test_name, 'REJECT', 'rejected',
                'rejected (' || sqlstate || ')', true, sqlerrm);
      end if;
  end;
end;
$$;
