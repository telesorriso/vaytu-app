-- =============================================================================
-- VAYTU — Migration 003: Indexes, extra constraints, helper functions, triggers
-- =============================================================================
-- Purpose : Harden the schema created in 002: indexes for FK/lookup columns,
--           extra CHECK/UNIQUE constraints, security-helper functions used by
--           both triggers here and RLS policies in 004, updated_at
--           maintenance, protected-column guards, the audit trail, basic
--           notification fan-out, and the application -> collaboration
--           state-machine glue.
-- Order   : Run AFTER 001 + 002, BEFORE 004_rls_policies.sql (004 depends on
--           the helper functions defined here).
-- =============================================================================

-- =============================================================================
-- SECTION 1 — Indexes
-- =============================================================================
-- Postgres does not automatically index foreign key columns; every FK used in
-- a join or in an RLS policy predicate gets one here. Kept intentionally
-- simple for MVP: no materialized views, no partial/expression indexes beyond
-- the couple that clearly pay for themselves (unread notifications, active
-- rows), no premature composite indexes.

-- profiles
create index idx_profiles_role on public.profiles (role);
create index idx_profiles_deleted_at on public.profiles (deleted_at) where deleted_at is not null;

-- creator_profiles
create index idx_creator_profiles_current_level_id on public.creator_profiles (current_level_id);
create index idx_creator_profiles_verification_status on public.creator_profiles (verification_status);

-- business_profiles
create index idx_business_profiles_verification_status on public.business_profiles (verification_status);

-- creator_metrics
create index idx_creator_metrics_creator_id on public.creator_metrics (creator_id);
create index idx_creator_metrics_platform on public.creator_metrics (platform);
create index idx_creator_metrics_verified_by on public.creator_metrics (verified_by);

-- creator_metric_evidence
create index idx_creator_metric_evidence_metric_id on public.creator_metric_evidence (metric_id);
create index idx_creator_metric_evidence_creator_id on public.creator_metric_evidence (creator_id);

-- creator_verifications
create index idx_creator_verifications_creator_id on public.creator_verifications (creator_id);
create index idx_creator_verifications_status on public.creator_verifications (status);
create index idx_creator_verifications_reviewed_by on public.creator_verifications (reviewed_by);

-- business_verifications
create index idx_business_verifications_business_id on public.business_verifications (business_id);
create index idx_business_verifications_status on public.business_verifications (status);
create index idx_business_verifications_reviewed_by on public.business_verifications (reviewed_by);

-- experiences
create index idx_experiences_business_id on public.experiences (business_id);
create index idx_experiences_status on public.experiences (status);
create index idx_experiences_min_level_id on public.experiences (min_level_id);
create index idx_experiences_published on public.experiences (status, created_at desc) where deleted_at is null;

-- experience_images
create index idx_experience_images_experience_id on public.experience_images (experience_id);

-- experience_slots
create index idx_experience_slots_experience_id on public.experience_slots (experience_id);

-- applications
create index idx_applications_experience_id on public.applications (experience_id);
create index idx_applications_slot_id on public.applications (slot_id);
create index idx_applications_creator_id on public.applications (creator_id);
create index idx_applications_business_id on public.applications (business_id);
create index idx_applications_status on public.applications (status);

-- collaborations
create index idx_collaborations_experience_id on public.collaborations (experience_id);
create index idx_collaborations_creator_id on public.collaborations (creator_id);
create index idx_collaborations_business_id on public.collaborations (business_id);
create index idx_collaborations_status on public.collaborations (status);

-- collaboration_deliverables
create index idx_collaboration_deliverables_collaboration_id on public.collaboration_deliverables (collaboration_id);
create index idx_collaboration_deliverables_status on public.collaboration_deliverables (status);

-- content_submissions
create index idx_content_submissions_deliverable_id on public.content_submissions (deliverable_id);
create index idx_content_submissions_collaboration_id on public.content_submissions (collaboration_id);
create index idx_content_submissions_creator_id on public.content_submissions (creator_id);
create index idx_content_submissions_business_id on public.content_submissions (business_id);
create index idx_content_submissions_status on public.content_submissions (status);

-- submission_metrics
create index idx_submission_metrics_submission_id on public.submission_metrics (submission_id);

-- reviews
create index idx_reviews_collaboration_id on public.reviews (collaboration_id);
create index idx_reviews_reviewer_id on public.reviews (reviewer_id);
create index idx_reviews_reviewee_id on public.reviews (reviewee_id);

-- notifications
create index idx_notifications_user_id on public.notifications (user_id);
create index idx_notifications_user_unread on public.notifications (user_id, created_at desc) where is_read = false;

-- admin_notes
create index idx_admin_notes_target on public.admin_notes (target_table, target_id);
create index idx_admin_notes_author_id on public.admin_notes (author_id);

-- audit_log
create index idx_audit_log_table_record on public.audit_log (table_name, record_id);
create index idx_audit_log_actor_id on public.audit_log (actor_id);
create index idx_audit_log_created_at on public.audit_log (created_at desc);

-- =============================================================================
-- SECTION 2 — Extra constraints not expressible inline in 002
-- =============================================================================

alter table public.experience_slots
  add constraint experience_slots_dates_valid check (end_date >= start_date),
  add constraint experience_slots_capacity_nonneg check (capacity >= 0),
  add constraint experience_slots_booked_within_capacity check (booked_count >= 0 and booked_count <= capacity);

alter table public.experiences
  add constraint experiences_max_creators_positive check (max_creators >= 1);

alter table public.applications
  add constraint applications_one_per_creator_per_experience unique (experience_id, creator_id);

alter table public.creator_profiles
  add constraint creator_profiles_reliability_score_range check (reliability_score >= 0 and reliability_score <= 100);

alter table public.creator_metrics
  add constraint creator_metrics_period_valid check (period_end is null or period_start is null or period_end >= period_start);

-- A profile's role must match which extension table(s) it owns is enforced at
-- the application layer + the FK relationship itself (a row can only exist in
-- creator_profiles/business_profiles if the referenced profiles.id exists);
-- cross-checking profiles.role against table membership is left to
-- application code / the sign-up RPC, to keep the schema simple for MVP.

-- =============================================================================
-- SECTION 3 — Security helper functions (used by triggers below and by the
-- RLS policies in 004_rls_policies.sql)
-- =============================================================================
-- All helper functions are STABLE + SECURITY DEFINER with a locked-down
-- search_path: SECURITY DEFINER lets them read public.profiles regardless of
-- the caller's RLS policies on that table (avoiding recursive-policy
-- deadlocks), while STABLE lets the planner cache results within a statement.

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and deleted_at is null;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and deleted_at is null
  );
$$;

create or replace function public.is_creator()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'creator' and deleted_at is null
  );
$$;

create or replace function public.is_business()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'business' and deleted_at is null
  );
$$;

-- True while inside a trusted internal write performed by one of the trigger
-- functions below (e.g. auto-incrementing a slot's booked_count, or syncing
-- creator_profiles.verification_status from creator_verifications). This lets
-- those internal writes touch otherwise-protected columns without granting
-- that ability to end users. The flag is set with is_local = true, so it is
-- automatically cleared at the end of the current transaction.
create or replace function public.is_trusted_system_context()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('vaytu.system_context', true), '') = 'on';
$$;

comment on function public.is_admin() is 'RLS helper: true if the calling JWT belongs to an active admin profile.';
comment on function public.is_trusted_system_context() is 'RLS/trigger helper: true only inside a SECURITY DEFINER trigger that explicitly opted into writing protected columns for this transaction.';

-- =============================================================================
-- SECTION 4 — updated_at maintenance
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_creator_levels_set_updated_at before update on public.creator_levels for each row execute function public.set_updated_at();
create trigger trg_creator_profiles_set_updated_at before update on public.creator_profiles for each row execute function public.set_updated_at();
create trigger trg_business_profiles_set_updated_at before update on public.business_profiles for each row execute function public.set_updated_at();
create trigger trg_creator_verifications_set_updated_at before update on public.creator_verifications for each row execute function public.set_updated_at();
create trigger trg_business_verifications_set_updated_at before update on public.business_verifications for each row execute function public.set_updated_at();
create trigger trg_experiences_set_updated_at before update on public.experiences for each row execute function public.set_updated_at();
create trigger trg_applications_set_updated_at before update on public.applications for each row execute function public.set_updated_at();
create trigger trg_collaborations_set_updated_at before update on public.collaborations for each row execute function public.set_updated_at();
create trigger trg_collaboration_deliverables_set_updated_at before update on public.collaboration_deliverables for each row execute function public.set_updated_at();
create trigger trg_content_submissions_set_updated_at before update on public.content_submissions for each row execute function public.set_updated_at();
create trigger trg_reviews_set_updated_at before update on public.reviews for each row execute function public.set_updated_at();
create trigger trg_admin_notes_set_updated_at before update on public.admin_notes for each row execute function public.set_updated_at();

-- =============================================================================
-- SECTION 5 — Protected-column guards
-- =============================================================================
-- RLS operates at row granularity, not column granularity: a policy that
-- lets a Creator UPDATE their own creator_profiles row cannot, by itself,
-- stop them from also changing reliability_score in the same statement.
-- These BEFORE UPDATE triggers close that gap by rejecting any change to the
-- listed columns unless the caller is an admin, or the change happens inside
-- a trusted internal system write (see is_trusted_system_context() above).

create or replace function public.protect_creator_protected_fields()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() or public.is_trusted_system_context() then
    return new;
  end if;

  if new.current_level_id is distinct from old.current_level_id then
    raise exception 'current_level_id is system-controlled and cannot be modified by the creator' using errcode = '42501';
  end if;
  if new.reliability_score is distinct from old.reliability_score then
    raise exception 'reliability_score is system-controlled and cannot be modified by the creator' using errcode = '42501';
  end if;
  if new.verification_status is distinct from old.verification_status then
    raise exception 'verification_status is system-controlled and cannot be modified by the creator' using errcode = '42501';
  end if;
  if new.completed_collaborations_count is distinct from old.completed_collaborations_count then
    raise exception 'completed_collaborations_count is system-controlled and cannot be modified by the creator' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger trg_protect_creator_protected_fields
  before update on public.creator_profiles
  for each row execute function public.protect_creator_protected_fields();

create or replace function public.protect_business_protected_fields()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() or public.is_trusted_system_context() then
    return new;
  end if;

  if new.verification_status is distinct from old.verification_status then
    raise exception 'verification_status is system-controlled and cannot be modified by the business' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger trg_protect_business_protected_fields
  before update on public.business_profiles
  for each row execute function public.protect_business_protected_fields();

-- profiles.role must never be self-escalated (e.g. a creator setting their
-- own role to 'admin'); profiles.is_active is an admin-only suspension flag.
-- deleted_at is intentionally NOT protected here: a user may soft-delete
-- their own account (self-service closure) — see /docs/SECURITY_MODEL.md
-- for why soft delete alone is not a GDPR erasure mechanism.
create or replace function public.protect_profiles_protected_fields()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() or public.is_trusted_system_context() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'role is system-controlled and cannot be modified by the user' using errcode = '42501';
  end if;
  if new.is_active is distinct from old.is_active then
    raise exception 'is_active is system-controlled and cannot be modified by the user' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger trg_protect_profiles_protected_fields
  before update on public.profiles
  for each row execute function public.protect_profiles_protected_fields();

-- =============================================================================
-- SECTION 6 — Audit trail (append-only, system-written only)
-- =============================================================================
-- SECURITY DEFINER + owned by the migration role (table owner) so that the
-- INSERT into audit_log succeeds even though 004 grants NO client (anon /
-- authenticated) role any write policy whatsoever on audit_log: the function
-- runs with the owner's privileges, and table owners bypass RLS by default
-- (audit_log does not set FORCE ROW LEVEL SECURITY).

create or replace function public.fn_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (actor_id, action, table_name, record_id, old_data, new_data)
    values (auth.uid(), 'insert', tg_table_name, new.id, null, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log (actor_id, action, table_name, record_id, old_data, new_data)
    values (auth.uid(), 'update', tg_table_name, new.id, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_log (actor_id, action, table_name, record_id, old_data, new_data)
    values (auth.uid(), 'delete', tg_table_name, old.id, to_jsonb(old), null);
    return old;
  end if;
  return null;
end;
$$;

comment on function public.fn_audit_log() is 'Generic AFTER trigger writing one audit_log row per INSERT/UPDATE/DELETE. SECURITY DEFINER so it can write audit_log even though no client role has direct write access to it (see 004).';

-- Attach the audit trigger to the tables where a tamper-evident trail
-- matters most for the marketplace (identity/verification, money-adjacent
-- decisions, and moderation-relevant content). Left off pure reference/log
-- tables (creator_levels, notifications, audit_log itself) and off
-- high-churn read-mostly rows without integrity stakes (experience_images).
create trigger trg_audit_creator_verifications after insert or update or delete on public.creator_verifications for each row execute function public.fn_audit_log();
create trigger trg_audit_business_verifications after insert or update or delete on public.business_verifications for each row execute function public.fn_audit_log();
create trigger trg_audit_creator_metrics after insert or update or delete on public.creator_metrics for each row execute function public.fn_audit_log();
create trigger trg_audit_applications after insert or update or delete on public.applications for each row execute function public.fn_audit_log();
create trigger trg_audit_collaborations after insert or update or delete on public.collaborations for each row execute function public.fn_audit_log();
create trigger trg_audit_content_submissions after insert or update or delete on public.content_submissions for each row execute function public.fn_audit_log();
create trigger trg_audit_reviews after insert or update or delete on public.reviews for each row execute function public.fn_audit_log();
create trigger trg_audit_admin_notes after insert or update or delete on public.admin_notes for each row execute function public.fn_audit_log();

-- =============================================================================
-- SECTION 7 — Notification fan-out (system-written only, see 004)
-- =============================================================================

create or replace function public.fn_notify_application_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_business_user_id uuid;
begin
  select id into v_business_user_id from public.business_profiles where id = new.business_id;
  if v_business_user_id is not null then
    insert into public.notifications (user_id, type, title, body, payload)
    values (
      v_business_user_id,
      'application_received',
      'Nuova candidatura ricevuta',
      'Hai ricevuto una nuova candidatura per una tua experience.',
      jsonb_build_object('application_id', new.id, 'experience_id', new.experience_id)
    );
  end if;
  return new;
end;
$$;

create trigger trg_notify_application_created
  after insert on public.applications
  for each row execute function public.fn_notify_application_created();

create or replace function public.fn_notify_application_decided()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into public.notifications (user_id, type, title, body, payload)
    values (
      new.creator_id,
      'application_accepted',
      'Candidatura accettata',
      'La tua candidatura è stata accettata.',
      jsonb_build_object('application_id', new.id, 'experience_id', new.experience_id)
    );
  elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
    insert into public.notifications (user_id, type, title, body, payload)
    values (
      new.creator_id,
      'application_rejected',
      'Candidatura non accettata',
      'La tua candidatura non è stata accettata questa volta.',
      jsonb_build_object('application_id', new.id, 'experience_id', new.experience_id)
    );
  end if;
  return new;
end;
$$;

create trigger trg_notify_application_decided
  after update on public.applications
  for each row execute function public.fn_notify_application_decided();

create or replace function public.fn_notify_submission_reviewed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status in ('approved', 'rejected') and old.status is distinct from new.status then
    insert into public.notifications (user_id, type, title, body, payload)
    values (
      new.creator_id,
      'submission_reviewed',
      case when new.status = 'approved' then 'Contenuto approvato' else 'Contenuto respinto' end,
      'Il tuo contenuto inviato è stato revisionato.',
      jsonb_build_object('content_submission_id', new.id, 'deliverable_id', new.deliverable_id, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger trg_notify_submission_reviewed
  after update on public.content_submissions
  for each row execute function public.fn_notify_submission_reviewed();

-- =============================================================================
-- SECTION 8 — Application -> Collaboration state machine glue
-- =============================================================================
-- When a business accepts an application, automatically: (1) create the
-- corresponding collaboration row, and (2) increment the booked_count of the
-- referenced slot (if any), refusing the acceptance if that would exceed the
-- slot's capacity. Both writes happen inside a trusted system context so
-- they are not blocked by any protected-column guard.

create or replace function public.fn_create_collaboration_on_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_capacity int;
  v_booked int;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then

    if new.slot_id is not null then
      select capacity, booked_count into v_capacity, v_booked
      from public.experience_slots
      where id = new.slot_id
      for update;

      if v_booked >= v_capacity then
        raise exception 'Cannot accept application %: slot % is already at full capacity', new.id, new.slot_id
          using errcode = '23514';
      end if;

      perform set_config('vaytu.system_context', 'on', true);
      update public.experience_slots
        set booked_count = booked_count + 1
        where id = new.slot_id;
    end if;

    insert into public.collaborations (application_id, experience_id, creator_id, business_id, status)
    values (new.id, new.experience_id, new.creator_id, new.business_id, 'active');

  end if;

  return new;
end;
$$;

create trigger trg_create_collaboration_on_acceptance
  after update on public.applications
  for each row execute function public.fn_create_collaboration_on_acceptance();

-- When a collaboration is marked completed, bump the creator's
-- completed_collaborations_count (protected column) via the trusted system
-- context, so future admin/level logic can rely on it.

create or replace function public.fn_on_collaboration_completed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform set_config('vaytu.system_context', 'on', true);
    update public.creator_profiles
      set completed_collaborations_count = completed_collaborations_count + 1
      where id = new.creator_id;

    insert into public.notifications (user_id, type, title, body, payload)
    values (
      new.creator_id,
      'collaboration_completed',
      'Collaborazione completata',
      'Una tua collaborazione è stata segnata come completata.',
      jsonb_build_object('collaboration_id', new.id)
    );
  end if;
  return new;
end;
$$;

create trigger trg_on_collaboration_completed
  after update on public.collaborations
  for each row execute function public.fn_on_collaboration_completed();

-- =============================================================================
-- SECTION 9 — Verification status sync (creator_verifications/business_verifications
-- -> denormalized *_profiles.verification_status cache)
-- =============================================================================

create or replace function public.fn_sync_creator_verification_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    perform set_config('vaytu.system_context', 'on', true);
    update public.creator_profiles
      set verification_status = new.status
      where id = new.creator_id;

    insert into public.notifications (user_id, type, title, body, payload)
    values (
      new.creator_id,
      'verification_update',
      'Stato verifica aggiornato',
      'Lo stato della tua verifica è cambiato in: ' || new.status,
      jsonb_build_object('creator_verification_id', new.id, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger trg_sync_creator_verification_status
  after update on public.creator_verifications
  for each row execute function public.fn_sync_creator_verification_status();

create or replace function public.fn_sync_business_verification_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    perform set_config('vaytu.system_context', 'on', true);
    update public.business_profiles
      set verification_status = new.status
      where id = new.business_id;

    insert into public.notifications (user_id, type, title, body, payload)
    values (
      new.business_id,
      'verification_update',
      'Stato verifica aggiornato',
      'Lo stato della tua verifica è cambiato in: ' || new.status,
      jsonb_build_object('business_verification_id', new.id, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger trg_sync_business_verification_status
  after update on public.business_verifications
  for each row execute function public.fn_sync_business_verification_status();
