#!/usr/bin/env bash
# =============================================================================
# VAYTU — LOCAL TEST HARNESS ONLY
# =============================================================================
# Rebuilds a throwaway PostgreSQL database from scratch, applies the 4
# canonical migrations UNCHANGED from /supabase/migrations, layers the local
# auth-schema emulation + fixtures + assertion helpers (this directory only,
# never shipped to Supabase), runs the RLS test suite for all 6 roles, and
# prints a final PASS/FAIL summary.
#
# This is a REAL execution against a REAL PostgreSQL 16 engine: real DDL,
# real constraints, real triggers, real RLS enforcement. It is NOT a test
# against an actual Supabase-hosted project (no GoTrue/Storage/Realtime) —
# see /docs/DATABASE.md and /docs/SECURITY_MODEL.md for what this does and
# does not prove.
#
# Usage: PGPASSWORD=... ./run_all.sh   (run as a role that can CREATE DATABASE,
#                                        e.g. via `sudo -u postgres ./run_all.sh`)
# =============================================================================
set -euo pipefail

DB_NAME="${VAYTU_TEST_DB:-vaytu_test}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PSQL="psql -v ON_ERROR_STOP=1 -X -q"

echo "== [1/4] Rebuilding database '$DB_NAME' from scratch =="
$PSQL -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
$PSQL -d postgres -c "CREATE DATABASE ${DB_NAME};"

echo "== [2/4] Bootstrap local auth emulation (schema auth must pre-exist, as it does on real Supabase) =="
$PSQL -d "$DB_NAME" -f "$SCRIPT_DIR/00_bootstrap_local_auth_emulation.sql"

echo "== [3/4] Applying canonical migrations (001 -> 004) =="
for f in 001_init_enums.sql 002_create_tables.sql 003_indexes_constraints_triggers.sql 004_rls_policies.sql \
         005_security_hardening.sql 006_revoke_public_execute_fix.sql 007_onboarding_profile_fields.sql \
         009_seed_creator_levels.sql 010_collaboration_update_hardening.sql; do
  # 008_onboarding_storage_buckets.sql is NOT run here: it targets Supabase's
  # `storage` schema, which only exists on the real hosted platform, not on
  # a vanilla local PostgreSQL instance.
  echo "   -> supabase/migrations/$f"
  $PSQL -d "$DB_NAME" -f "$REPO_ROOT/supabase/migrations/$f"
done

echo "== Seeding fixtures + loading test helpers =="
$PSQL -d "$DB_NAME" -f "$SCRIPT_DIR/01_seed_fixtures.sql"
$PSQL -d "$DB_NAME" -f "$SCRIPT_DIR/02_test_helpers.sql"

echo "== [4/4] Running RLS test suite for all 6 roles + post-collaboration tests =="
# 50_post_collaboration_tests.sql is not per-role: it covers the reviews /
# submissions / reporting-isolation / notification-ownership rules the
# Post-Collaboration milestone depends on, switching role per assertion.
# 60_application_submit_tests.sql closes the gap the "creator application
# fails" investigation found: no file ever exercised a legitimate
# application INSERT actually succeeding, only a single DENY case.
# 61_application_creator_profile_tests.sql covers the "Business doesn't see
# the Creator profile in application detail" investigation: the corrected
# creator_profiles column list, real content ownership, and that a
# competing business cannot read another business's application at all.
for f in 10_rls_test_anonymous.sql 20_rls_test_creator_a.sql 21_rls_test_creator_b.sql \
         30_rls_test_business_a.sql 31_rls_test_business_b.sql 40_rls_test_admin.sql \
         50_post_collaboration_tests.sql 60_application_submit_tests.sql \
         61_application_creator_profile_tests.sql; do
  echo "   -> $f"
  $PSQL -d "$DB_NAME" -f "$SCRIPT_DIR/$f"
done

echo
echo "================================ RESULTS ================================"
$PSQL -d "$DB_NAME" -c "
  select role_under_test as role,
         count(*) filter (where passed)      as passed,
         count(*) filter (where not passed)  as failed,
         count(*)                            as total
  from testing.results
  group by role_under_test
  order by role_under_test;
"

$PSQL -d "$DB_NAME" -c "
  select role_under_test as role, test_name, kind, expected, actual, detail
  from testing.results
  where not passed
  order by role_under_test, id;
"

TOTAL_FAILED=$($PSQL -d "$DB_NAME" -t -A -c "select count(*) from testing.results where not passed;")
TOTAL_PASSED=$($PSQL -d "$DB_NAME" -t -A -c "select count(*) from testing.results where passed;")
TOTAL=$($PSQL -d "$DB_NAME" -t -A -c "select count(*) from testing.results;")

echo "==========================================================================="
echo "TOTAL: ${TOTAL_PASSED}/${TOTAL} passed, ${TOTAL_FAILED} failed"

if [ "$TOTAL_FAILED" -ne 0 ]; then
  echo "RESULT: FAIL"
  exit 1
else
  echo "RESULT: PASS"
fi
