-- =============================================================================
-- VAYTU — Migration 008: Storage buckets for onboarding uploads
-- =============================================================================
-- Purpose : Two Supabase Storage buckets needed by the Creator/Business
--           onboarding flows (avatars/logos/covers, and verification
--           evidence screenshots). Not testable against the local
--           PostgreSQL harness in /tests/integration/ — the `storage`
--           schema is provided by Supabase's hosted Storage service, not
--           by vanilla PostgreSQL. Applied and verified directly against
--           the hosted Vaytu project; see /docs/DATABASE.md for what that
--           verification covered.
--
-- Path convention: every object is stored at `{owner_id}/...`, where
-- owner_id is the uploading profile's auth.uid(). Policies below check
-- `(storage.foldername(name))[1] = auth.uid()::text` — the first path
-- segment must be the caller's own id. This mirrors the ownership pattern
-- already used throughout 004_rls_policies.sql.
--
-- public-assets      (public bucket)  — avatars, business logos/covers.
--                       Publicly readable (profile pictures/logos are
--                       meant to be seen), owner-only write.
-- verification-evidence (private bucket) — creator metric proof
--                       screenshots (profile/reach/audience/performance)
--                       and creator/business verification documents.
--                       Readable ONLY by the owner and admins — never by
--                       businesses or other creators, matching
--                       creator_metric_evidence's RLS in 004_rls_policies.sql.
-- =============================================================================

insert into storage.buckets (id, name, public)
values
  ('public-assets', 'public-assets', true),
  ('verification-evidence', 'verification-evidence', false)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- public-assets: public read, owner-only write
-- -----------------------------------------------------------------------------

create policy public_assets_select_all on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'public-assets');

create policy public_assets_insert_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'public-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy public_assets_update_owner on storage.objects
  for update to authenticated
  using (
    bucket_id = 'public-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'public-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy public_assets_delete_owner on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'public-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- verification-evidence: private, owner + admin only
-- -----------------------------------------------------------------------------

create policy verification_evidence_select_owner_or_admin on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification-evidence'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

create policy verification_evidence_insert_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'verification-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Deliberately no UPDATE policy: evidence is immutable once uploaded,
-- consistent with creator_metric_evidence having no UPDATE policy in
-- 004_rls_policies.sql — retract (delete) and re-upload instead.

create policy verification_evidence_delete_owner_or_admin on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'verification-evidence'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );
