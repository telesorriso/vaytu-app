-- =============================================================================
-- VAYTU — Migration 005: Security hardening (search_path + RPC surface)
-- =============================================================================
-- Purpose : Address the 23 WARN-level findings raised by Supabase's security
--           advisor after 001-004 (0 ERROR-level findings; none related to
--           missing RLS). Strictly scoped to two fixes:
--             1. Pin a safe, explicit search_path on the 5 trigger/helper
--                functions that were missing one.
--             2. Revoke EXECUTE (anon, authenticated) on the SECURITY
--                DEFINER functions that exist ONLY to be invoked by triggers
--                — never meant to be called directly via PostgREST RPC.
--           No schema moves, no architectural refactor, no behavior change
--           for any legitimate caller (triggers invoke functions regardless
--           of the invoking session's EXECUTE grant).
-- Order   : Run AFTER 001 + 002 + 003 + 004, against a database that already
--           has all 17 public functions from those migrations.
-- Verified before writing this migration (see chat/introspection): all 17
-- public functions take zero arguments (no overloads), so `name()` is an
-- unambiguous, exact signature for every ALTER/REVOKE below.
-- =============================================================================

-- =============================================================================
-- SECTION 1 — Pin search_path on the 5 functions flagged by
-- `function_search_path_mutable`
-- =============================================================================
-- These 5 were the only public functions left without search_path pinned in
-- 003 (every SECURITY DEFINER helper there already had it). A mutable
-- search_path on a function is a known name-resolution hijack vector if an
-- object of the same name could be created earlier in the resolution order.

alter function public.set_updated_at()
  set search_path = public, pg_temp;

alter function public.protect_creator_protected_fields()
  set search_path = public, pg_temp;

alter function public.protect_business_protected_fields()
  set search_path = public, pg_temp;

alter function public.protect_profiles_protected_fields()
  set search_path = public, pg_temp;

alter function public.is_trusted_system_context()
  set search_path = public, pg_temp;

-- =============================================================================
-- SECTION 2 — Revoke EXECUTE on trigger-only SECURITY DEFINER functions
-- =============================================================================
-- Supabase exposes every function in the `public` schema as a PostgREST RPC
-- endpoint (/rest/v1/rpc/<name>) by default. The 8 functions below all
-- return `trigger` and are attached exclusively to real triggers (verified:
-- each has >=1 non-internal pg_trigger row referencing it, 15 total). They
-- are not designed to be called directly — outside a trigger context
-- NEW/OLD/TG_OP are undefined and the call would error — but they still
-- represent unnecessary API surface flagged by the advisor
-- (anon_security_definer_function_executable /
-- authenticated_security_definer_function_executable). Triggers keep firing
-- normally after this: trigger invocation is driven by the table's trigger
-- definition, not by the firing session's function-level EXECUTE grant.
--
-- Deliberately NOT touched here: is_admin(), is_creator(), is_business(),
-- current_profile_role() — these ARE meant to be reachable by anon/
-- authenticated (RLS policies in 004 call them via auth.uid() in the
-- caller's own session, and nothing prevents/needs them being independently
-- callable too; revoking here was verified unnecessary for policies to keep
-- working, since RLS evaluates policy expressions with the definer's rights
-- regardless of the calling role's own EXECUTE grant — but they are excluded
-- from this migration's scope entirely, per explicit instruction).
--
-- IMPORTANT: Postgres grants EXECUTE on every newly created function to the
-- implicit PUBLIC pseudo-role by default (proacl starts as `{=X/owner,...}`,
-- where the empty role name before `=` denotes PUBLIC). Every real role,
-- including anon and authenticated, inherits privileges from PUBLIC.
-- REVOKE ... FROM anon, authenticated alone does NOT remove that standing
-- PUBLIC grant, so it has no real effect on its own — verified against the
-- hosted database with has_function_privilege() after applying an earlier,
-- incomplete version of this migration (anon/authenticated could still
-- execute all 8 functions). REVOKE ... FROM PUBLIC is what actually closes
-- it; the explicit anon/authenticated revokes are kept alongside it purely
-- for readability/documentation of intent, not because they do anything
-- PUBLIC doesn't already cover.

revoke execute on function public.fn_audit_log() from public, anon, authenticated;
revoke execute on function public.fn_create_collaboration_on_acceptance() from public, anon, authenticated;
revoke execute on function public.fn_notify_application_created() from public, anon, authenticated;
revoke execute on function public.fn_notify_application_decided() from public, anon, authenticated;
revoke execute on function public.fn_notify_submission_reviewed() from public, anon, authenticated;
revoke execute on function public.fn_on_collaboration_completed() from public, anon, authenticated;
revoke execute on function public.fn_sync_business_verification_status() from public, anon, authenticated;
revoke execute on function public.fn_sync_creator_verification_status() from public, anon, authenticated;
