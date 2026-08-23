-- =============================================================================
-- VAYTU — Migration 004: Row Level Security policies
-- =============================================================================
-- Purpose : Enable RLS on every table and define the complete set of
--           SELECT/INSERT/UPDATE/DELETE policies for the anon,
--           authenticated (creator/business/admin, distinguished via
--           public.profiles.role) Supabase Postgres roles.
-- Order   : Run AFTER 001 + 002 + 003 (uses is_admin()/is_creator()/
--           is_business() defined in 003).
-- Notes   : - service_role is NOT referenced anywhere below: Supabase's
--             service_role Postgres role has BYPASSRLS and is intended for
--             trusted server-side code only. It must never be shipped to a
--             browser/client bundle (see /docs/SECURITY_MODEL.md).
--           - Table-level GRANTs (Section 0) are the outer gate; RLS
--             policies (everything after) are the inner, per-row gate. A
--             role needs BOTH the table-level privilege and a satisfied
--             policy to read/write a row.
-- =============================================================================

-- =============================================================================
-- SECTION 0 — Table-level grants
-- =============================================================================
-- anon: only the public-discovery surface (published experiences + their
-- images/slots, the business profiles behind them, and the creator_levels
-- reference table). Everything else requires authentication.
-- authenticated: broad table-level grants; RLS policies below do the real
-- per-row restriction for every role (creator/business/admin).

grant usage on schema public to anon, authenticated;

grant select on public.creator_levels to anon, authenticated;
grant insert, update, delete on public.creator_levels to authenticated;
grant select on public.business_profiles to anon, authenticated;
grant select on public.experiences to anon, authenticated;
grant select on public.experience_images to anon, authenticated;
grant select on public.experience_slots to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.creator_profiles to authenticated;
grant insert, update, delete on public.business_profiles to authenticated;
grant select, insert, update, delete on public.creator_metrics to authenticated;
grant select, insert, update, delete on public.creator_metric_evidence to authenticated;
grant select, insert, update, delete on public.creator_verifications to authenticated;
grant select, insert, update, delete on public.business_verifications to authenticated;
grant insert, update, delete on public.experiences to authenticated;
grant insert, update, delete on public.experience_images to authenticated;
grant insert, update, delete on public.experience_slots to authenticated;
grant select, insert, update, delete on public.applications to authenticated;
grant select, insert, update, delete on public.collaborations to authenticated;
grant select, insert, update, delete on public.collaboration_deliverables to authenticated;
grant select, insert, update, delete on public.content_submissions to authenticated;
grant select, insert, update, delete on public.submission_metrics to authenticated;
grant select, insert, update, delete on public.reviews to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.admin_notes to authenticated;
-- audit_log: SELECT only — no client role ever gets INSERT/UPDATE/DELETE.
-- Rows are written exclusively by the SECURITY DEFINER trigger in 003.
grant select on public.audit_log to authenticated;

-- Belt-and-suspenders: explicitly deny what should never be grantable, in
-- case a future migration or a Supabase project template default changes.
revoke insert, update, delete on public.audit_log from anon, authenticated;
revoke all on public.audit_log from anon;
revoke all on public.admin_notes from anon;
revoke all on public.creator_metric_evidence from anon;
revoke all on public.creator_verifications from anon;
revoke all on public.business_verifications from anon;

-- =============================================================================
-- SECTION 1 — Enable Row Level Security everywhere
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.creator_levels enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.business_profiles enable row level security;
alter table public.creator_metrics enable row level security;
alter table public.creator_metric_evidence enable row level security;
alter table public.creator_verifications enable row level security;
alter table public.business_verifications enable row level security;
alter table public.experiences enable row level security;
alter table public.experience_images enable row level security;
alter table public.experience_slots enable row level security;
alter table public.applications enable row level security;
alter table public.collaborations enable row level security;
alter table public.collaboration_deliverables enable row level security;
alter table public.content_submissions enable row level security;
alter table public.submission_metrics enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_notes enable row level security;
alter table public.audit_log enable row level security;

-- =============================================================================
-- SECTION 2 — profiles
-- =============================================================================
-- Base identity/contact data (email, phone, full legal name) is private:
-- visible only to its owner and to admins. Public-facing display data lives
-- in creator_profiles.display_name / business_profiles.company_name instead.

create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (public.is_admin());

create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and role <> 'admin');

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
  -- role / is_active remain protected by trg_protect_profiles_protected_fields (003)

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy profiles_delete_admin on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- =============================================================================
-- SECTION 3 — creator_levels (public reference data, admin-managed)
-- =============================================================================

create policy creator_levels_select_all on public.creator_levels
  for select to anon, authenticated
  using (true);

create policy creator_levels_write_admin on public.creator_levels
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- SECTION 4 — creator_profiles
-- =============================================================================
-- Visible to: the owning creator, admins, and businesses (who need to browse
-- / vet creators for their experiences). NOT visible to other creators — see
-- /docs/SECURITY_MODEL.md for the rationale (conservative MVP default).

create policy creator_profiles_select_self on public.creator_profiles
  for select to authenticated
  using (id = auth.uid());

create policy creator_profiles_select_business on public.creator_profiles
  for select to authenticated
  using (public.is_business());

create policy creator_profiles_select_admin on public.creator_profiles
  for select to authenticated
  using (public.is_admin());

create policy creator_profiles_insert_self on public.creator_profiles
  for insert to authenticated
  with check (id = auth.uid() and public.is_creator());

create policy creator_profiles_update_self on public.creator_profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
  -- current_level_id / reliability_score / verification_status /
  -- completed_collaborations_count remain protected by
  -- trg_protect_creator_protected_fields (003)

create policy creator_profiles_update_admin on public.creator_profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy creator_profiles_delete_admin on public.creator_profiles
  for delete to authenticated
  using (public.is_admin());

-- =============================================================================
-- SECTION 5 — business_profiles (public company directory)
-- =============================================================================

create policy business_profiles_select_all on public.business_profiles
  for select to anon, authenticated
  using (true);

create policy business_profiles_insert_self on public.business_profiles
  for insert to authenticated
  with check (id = auth.uid() and public.is_business());

create policy business_profiles_update_self on public.business_profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
  -- verification_status remains protected by trg_protect_business_protected_fields (003)

create policy business_profiles_update_admin on public.business_profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy business_profiles_delete_admin on public.business_profiles
  for delete to authenticated
  using (public.is_admin());

-- =============================================================================
-- SECTION 6 — creator_metrics
-- =============================================================================
-- Aggregate, self-reported/verified numbers (follower counts, engagement
-- rate...). Businesses may read these to vet creators; the raw proof files
-- stay private in creator_metric_evidence (Section 7).

create policy creator_metrics_select_self on public.creator_metrics
  for select to authenticated
  using (creator_id = auth.uid());

create policy creator_metrics_select_business on public.creator_metrics
  for select to authenticated
  using (public.is_business());

create policy creator_metrics_select_admin on public.creator_metrics
  for select to authenticated
  using (public.is_admin());

create policy creator_metrics_insert_self on public.creator_metrics
  for insert to authenticated
  with check (
    creator_id = auth.uid()
    and public.is_creator()
    and source = 'self_reported'
    and is_verified = false
  );

create policy creator_metrics_insert_admin on public.creator_metrics
  for insert to authenticated
  with check (public.is_admin());

-- No UPDATE policy for creators: verification fields (is_verified,
-- verified_by, verified_at, source) must only ever be set by admins.
create policy creator_metrics_update_admin on public.creator_metrics
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy creator_metrics_delete_self_unverified on public.creator_metrics
  for delete to authenticated
  using (creator_id = auth.uid() and is_verified = false);

create policy creator_metrics_delete_admin on public.creator_metrics
  for delete to authenticated
  using (public.is_admin());

-- =============================================================================
-- SECTION 7 — creator_metric_evidence (strictly private)
-- =============================================================================
-- Never readable by businesses or other creators, per spec.

create policy creator_metric_evidence_select_self on public.creator_metric_evidence
  for select to authenticated
  using (creator_id = auth.uid());

create policy creator_metric_evidence_select_admin on public.creator_metric_evidence
  for select to authenticated
  using (public.is_admin());

create policy creator_metric_evidence_insert_self on public.creator_metric_evidence
  for insert to authenticated
  with check (
    creator_id = auth.uid()
    and public.is_creator()
    and exists (
      select 1 from public.creator_metrics m
      where m.id = metric_id and m.creator_id = auth.uid()
    )
  );

create policy creator_metric_evidence_delete_self on public.creator_metric_evidence
  for delete to authenticated
  using (creator_id = auth.uid());

create policy creator_metric_evidence_delete_admin on public.creator_metric_evidence
  for delete to authenticated
  using (public.is_admin());

-- Deliberately no UPDATE policy at all (creator or admin): evidence files
-- are immutable once uploaded — retract (delete) and re-upload instead.

-- =============================================================================
-- SECTION 8 — creator_verifications (never visible to businesses)
-- =============================================================================

create policy creator_verifications_select_self on public.creator_verifications
  for select to authenticated
  using (creator_id = auth.uid());

create policy creator_verifications_select_admin on public.creator_verifications
  for select to authenticated
  using (public.is_admin());

create policy creator_verifications_insert_self on public.creator_verifications
  for insert to authenticated
  with check (creator_id = auth.uid() and public.is_creator() and status = 'pending');

-- No UPDATE policy for creators: only admins decide verification outcomes.
create policy creator_verifications_update_admin on public.creator_verifications
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy creator_verifications_delete_self_pending on public.creator_verifications
  for delete to authenticated
  using (creator_id = auth.uid() and status = 'pending');

create policy creator_verifications_delete_admin on public.creator_verifications
  for delete to authenticated
  using (public.is_admin());

-- =============================================================================
-- SECTION 9 — business_verifications (mirror of Section 8)
-- =============================================================================

create policy business_verifications_select_self on public.business_verifications
  for select to authenticated
  using (business_id = auth.uid());

create policy business_verifications_select_admin on public.business_verifications
  for select to authenticated
  using (public.is_admin());

create policy business_verifications_insert_self on public.business_verifications
  for insert to authenticated
  with check (business_id = auth.uid() and public.is_business() and status = 'pending');

create policy business_verifications_update_admin on public.business_verifications
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy business_verifications_delete_self_pending on public.business_verifications
  for delete to authenticated
  using (business_id = auth.uid() and status = 'pending');

create policy business_verifications_delete_admin on public.business_verifications
  for delete to authenticated
  using (public.is_admin());

-- =============================================================================
-- SECTION 10 — experiences
-- =============================================================================

create policy experiences_select_public on public.experiences
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

create policy experiences_select_owner on public.experiences
  for select to authenticated
  using (business_id = auth.uid());

create policy experiences_select_admin on public.experiences
  for select to authenticated
  using (public.is_admin());

create policy experiences_insert_owner on public.experiences
  for insert to authenticated
  with check (business_id = auth.uid() and public.is_business());

create policy experiences_update_owner on public.experiences
  for update to authenticated
  using (business_id = auth.uid())
  with check (business_id = auth.uid());

create policy experiences_update_admin on public.experiences
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy experiences_delete_owner on public.experiences
  for delete to authenticated
  using (business_id = auth.uid());

create policy experiences_delete_admin on public.experiences
  for delete to authenticated
  using (public.is_admin());

-- =============================================================================
-- SECTION 11 — experience_images (visibility follows the parent experience)
-- =============================================================================

create policy experience_images_select_public on public.experience_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.experiences e
      where e.id = experience_id and e.status = 'published' and e.deleted_at is null
    )
  );

create policy experience_images_select_owner on public.experience_images
  for select to authenticated
  using (
    exists (select 1 from public.experiences e where e.id = experience_id and e.business_id = auth.uid())
  );

create policy experience_images_select_admin on public.experience_images
  for select to authenticated
  using (public.is_admin());

create policy experience_images_write_owner on public.experience_images
  for all to authenticated
  using (
    exists (select 1 from public.experiences e where e.id = experience_id and e.business_id = auth.uid())
  )
  with check (
    exists (select 1 from public.experiences e where e.id = experience_id and e.business_id = auth.uid())
  );

create policy experience_images_write_admin on public.experience_images
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- SECTION 12 — experience_slots (visibility follows the parent experience)
-- =============================================================================

create policy experience_slots_select_public on public.experience_slots
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.experiences e
      where e.id = experience_id and e.status = 'published' and e.deleted_at is null
    )
  );

create policy experience_slots_select_owner on public.experience_slots
  for select to authenticated
  using (
    exists (select 1 from public.experiences e where e.id = experience_id and e.business_id = auth.uid())
  );

create policy experience_slots_select_admin on public.experience_slots
  for select to authenticated
  using (public.is_admin());

create policy experience_slots_write_owner on public.experience_slots
  for all to authenticated
  using (
    exists (select 1 from public.experiences e where e.id = experience_id and e.business_id = auth.uid())
  )
  with check (
    exists (select 1 from public.experiences e where e.id = experience_id and e.business_id = auth.uid())
  );

create policy experience_slots_write_admin on public.experience_slots
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- SECTION 13 — applications
-- =============================================================================

create policy applications_select_creator on public.applications
  for select to authenticated
  using (creator_id = auth.uid());

create policy applications_select_business on public.applications
  for select to authenticated
  using (business_id = auth.uid());

create policy applications_select_admin on public.applications
  for select to authenticated
  using (public.is_admin());

create policy applications_insert_creator on public.applications
  for insert to authenticated
  with check (
    creator_id = auth.uid()
    and public.is_creator()
    and status = 'pending'
    and exists (
      select 1 from public.experiences e
      where e.id = experience_id
        and e.business_id = applications.business_id
        and e.status = 'published'
        and e.deleted_at is null
    )
  );

-- Creator may only withdraw their own still-pending application.
create policy applications_update_creator_withdraw on public.applications
  for update to authenticated
  using (creator_id = auth.uid() and status = 'pending')
  with check (creator_id = auth.uid() and status = 'withdrawn');

-- Business may only decide (accept/reject) a still-pending application to
-- one of its own experiences.
create policy applications_update_business_decide on public.applications
  for update to authenticated
  using (business_id = auth.uid() and status = 'pending')
  with check (business_id = auth.uid() and status in ('accepted', 'rejected'));

create policy applications_update_admin on public.applications
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy applications_delete_creator_pending on public.applications
  for delete to authenticated
  using (creator_id = auth.uid() and status = 'pending');

create policy applications_delete_admin on public.applications
  for delete to authenticated
  using (public.is_admin());

-- =============================================================================
-- SECTION 14 — collaborations
-- =============================================================================
-- No client INSERT policy: rows are created exclusively by the
-- fn_create_collaboration_on_acceptance SECURITY DEFINER trigger (003),
-- which bypasses RLS as the table owner.

create policy collaborations_select_participant on public.collaborations
  for select to authenticated
  using (creator_id = auth.uid() or business_id = auth.uid());

create policy collaborations_select_admin on public.collaborations
  for select to authenticated
  using (public.is_admin());

-- Either participant may update status (e.g. mark completed/cancelled/
-- disputed); a finer-grained state machine is left for a future iteration
-- (see /docs/DATABASE.md — Known MVP limitations).
create policy collaborations_update_participant on public.collaborations
  for update to authenticated
  using (creator_id = auth.uid() or business_id = auth.uid())
  with check (creator_id = auth.uid() or business_id = auth.uid());

create policy collaborations_update_admin on public.collaborations
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy collaborations_delete_admin on public.collaborations
  for delete to authenticated
  using (public.is_admin());

create policy collaborations_insert_admin on public.collaborations
  for insert to authenticated
  with check (public.is_admin());

-- =============================================================================
-- SECTION 15 — collaboration_deliverables
-- =============================================================================

create policy collaboration_deliverables_select_participant on public.collaboration_deliverables
  for select to authenticated
  using (
    exists (
      select 1 from public.collaborations c
      where c.id = collaboration_id and (c.creator_id = auth.uid() or c.business_id = auth.uid())
    )
  );

create policy collaboration_deliverables_select_admin on public.collaboration_deliverables
  for select to authenticated
  using (public.is_admin());

create policy collaboration_deliverables_write_business on public.collaboration_deliverables
  for all to authenticated
  using (
    exists (select 1 from public.collaborations c where c.id = collaboration_id and c.business_id = auth.uid())
  )
  with check (
    exists (select 1 from public.collaborations c where c.id = collaboration_id and c.business_id = auth.uid())
  );

create policy collaboration_deliverables_write_admin on public.collaboration_deliverables
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- SECTION 16 — content_submissions
-- =============================================================================
-- Unlike creator_metric_evidence, this table IS meant to be visible to the
-- counterpart business: it is the deliverable proof itself, not private
-- profile-verification evidence.

create policy content_submissions_select_creator on public.content_submissions
  for select to authenticated
  using (creator_id = auth.uid());

create policy content_submissions_select_business on public.content_submissions
  for select to authenticated
  using (business_id = auth.uid());

create policy content_submissions_select_admin on public.content_submissions
  for select to authenticated
  using (public.is_admin());

create policy content_submissions_insert_creator on public.content_submissions
  for insert to authenticated
  with check (
    creator_id = auth.uid()
    and public.is_creator()
    and status = 'pending_review'
    and exists (
      select 1 from public.collaborations c
      where c.id = collaboration_id
        and c.creator_id = auth.uid()
        and c.business_id = content_submissions.business_id
    )
    and exists (
      select 1 from public.collaboration_deliverables d
      where d.id = deliverable_id and d.collaboration_id = content_submissions.collaboration_id
    )
  );

-- Creator may edit their own submission only while still pending review
-- (fix a typo/link before the business looks at it); cannot self-approve.
create policy content_submissions_update_creator on public.content_submissions
  for update to authenticated
  using (creator_id = auth.uid() and status = 'pending_review')
  with check (creator_id = auth.uid() and status = 'pending_review');

-- Business reviews (approve/reject) submissions made to its own collaboration.
create policy content_submissions_update_business on public.content_submissions
  for update to authenticated
  using (business_id = auth.uid())
  with check (business_id = auth.uid());

create policy content_submissions_update_admin on public.content_submissions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy content_submissions_delete_creator_pending on public.content_submissions
  for delete to authenticated
  using (creator_id = auth.uid() and status = 'pending_review');

create policy content_submissions_delete_admin on public.content_submissions
  for delete to authenticated
  using (public.is_admin());

-- =============================================================================
-- SECTION 17 — submission_metrics
-- =============================================================================

create policy submission_metrics_select_participant on public.submission_metrics
  for select to authenticated
  using (
    exists (
      select 1 from public.content_submissions s
      where s.id = submission_id and (s.creator_id = auth.uid() or s.business_id = auth.uid())
    )
  );

create policy submission_metrics_select_admin on public.submission_metrics
  for select to authenticated
  using (public.is_admin());

create policy submission_metrics_insert_creator on public.submission_metrics
  for insert to authenticated
  with check (
    source = 'self_reported'
    and is_verified = false
    and exists (
      select 1 from public.content_submissions s
      where s.id = submission_id and s.creator_id = auth.uid()
    )
  );

-- No UPDATE policy for creators/businesses: verification is admin-only,
-- consistent with creator_metrics (Section 6).
create policy submission_metrics_update_admin on public.submission_metrics
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy submission_metrics_delete_creator_unverified on public.submission_metrics
  for delete to authenticated
  using (
    is_verified = false
    and exists (
      select 1 from public.content_submissions s
      where s.id = submission_id and s.creator_id = auth.uid()
    )
  );

create policy submission_metrics_delete_admin on public.submission_metrics
  for delete to authenticated
  using (public.is_admin());

-- =============================================================================
-- SECTION 18 — reviews
-- =============================================================================
-- No public review directory in the MVP: visible only to the two parties
-- involved and to admins (moderation).

create policy reviews_select_participant on public.reviews
  for select to authenticated
  using (reviewer_id = auth.uid() or reviewee_id = auth.uid());

create policy reviews_select_admin on public.reviews
  for select to authenticated
  using (public.is_admin());

-- A review may only be created by a genuine participant of a *completed*
-- collaboration, about the other participant, matching review_type.
create policy reviews_insert_participant on public.reviews
  for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.collaborations c
      where c.id = collaboration_id
        and c.status = 'completed'
        and (
          (c.creator_id = auth.uid() and reviewee_id = c.business_id and review_type = 'creator_to_business')
          or
          (c.business_id = auth.uid() and reviewee_id = c.creator_id and review_type = 'business_to_creator')
        )
    )
  );

create policy reviews_update_reviewer on public.reviews
  for update to authenticated
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid());

create policy reviews_update_admin on public.reviews
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy reviews_delete_reviewer on public.reviews
  for delete to authenticated
  using (reviewer_id = auth.uid());

create policy reviews_delete_admin on public.reviews
  for delete to authenticated
  using (public.is_admin());

-- =============================================================================
-- SECTION 19 — notifications
-- =============================================================================
-- No INSERT policy for regular creators/businesses: rows are produced by the
-- trusted SECURITY DEFINER triggers in 003 (which bypass RLS as the table
-- owner). Admins additionally get an explicit INSERT policy for manual
-- system/broadcast messages.

create policy notifications_select_self on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy notifications_select_admin on public.notifications
  for select to authenticated
  using (public.is_admin());

create policy notifications_insert_admin on public.notifications
  for insert to authenticated
  with check (public.is_admin());

create policy notifications_update_self on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_update_admin on public.notifications
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy notifications_delete_self on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

create policy notifications_delete_admin on public.notifications
  for delete to authenticated
  using (public.is_admin());

-- =============================================================================
-- SECTION 20 — admin_notes (admin-only, always)
-- =============================================================================

create policy admin_notes_all_admin on public.admin_notes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No policy at all for non-admin authenticated users: default deny.

-- =============================================================================
-- SECTION 21 — audit_log (admin-only read, system-only write)
-- =============================================================================
-- No INSERT/UPDATE/DELETE policy exists for ANY client role (including
-- admin): the only writer is the SECURITY DEFINER fn_audit_log() trigger
-- (003), which bypasses RLS as the table owner. This is intentional and
-- matches the requirement that audit_log must never be arbitrarily
-- writable from the client.

create policy audit_log_select_admin on public.audit_log
  for select to authenticated
  using (public.is_admin());
