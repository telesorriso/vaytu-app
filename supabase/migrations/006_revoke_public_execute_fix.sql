-- Corrective follow-up to 005_security_hardening: the earlier REVOKE EXECUTE
-- ... FROM anon, authenticated had no real effect because EXECUTE was
-- granted to the implicit PUBLIC pseudo-role at function creation time, and
-- anon/authenticated inherit privileges from PUBLIC. REVOKE ... FROM PUBLIC
-- is what actually removes it. The canonical 005_security_hardening.sql in
-- the repository has been corrected in place to include this from the
-- start (REVOKE ... FROM PUBLIC, ANON, AUTHENTICATED), so a fresh database
-- only needs one migration run. This statement brings the already-migrated
-- Vaytu hosted project to that same corrected state.

revoke execute on function public.fn_audit_log() from public, anon, authenticated;
revoke execute on function public.fn_create_collaboration_on_acceptance() from public, anon, authenticated;
revoke execute on function public.fn_notify_application_created() from public, anon, authenticated;
revoke execute on function public.fn_notify_application_decided() from public, anon, authenticated;
revoke execute on function public.fn_notify_submission_reviewed() from public, anon, authenticated;
revoke execute on function public.fn_on_collaboration_completed() from public, anon, authenticated;
revoke execute on function public.fn_sync_business_verification_status() from public, anon, authenticated;
revoke execute on function public.fn_sync_creator_verification_status() from public, anon, authenticated;
