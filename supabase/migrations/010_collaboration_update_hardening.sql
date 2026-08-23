-- =============================================================================
-- VAYTU — Migration 010: Collaboration UPDATE hardening
-- =============================================================================
-- Purpose : Close the collaboration authorization gap left open by 004.
-- Order   : Run AFTER 001-009. Additive only — no schema change, no data
--           change, no other policy touched.
--
-- WHAT WAS WRONG
-- --------------
-- 004 created:
--
--   create policy collaborations_update_participant ... for update
--     using      (creator_id = auth.uid() or business_id = auth.uid())
--     with check (creator_id = auth.uid() or business_id = auth.uid());
--
-- with the comment "Either participant may update status ... a finer-grained
-- state machine is left for a future iteration". Verified against a real
-- PostgreSQL instance, that policy allows a Creator to:
--
--   1. Set their own collaboration to status = 'completed'. This fires
--      fn_on_collaboration_completed (003), which increments the Creator's
--      OWN protected completed_collaborations_count — a reputation counter
--      the Creator is otherwise explicitly forbidden from touching by
--      protect_creator_protected_fields. Measured: counter 1 -> 2.
--
--   2. Rewrite business_id to an unrelated Business, and experience_id to an
--      unrelated Experience. The WITH CHECK still passes because creator_id
--      continues to equal auth.uid(), so only ONE of the two ownership
--      columns is actually pinned. This hands a Creator the ability to
--      reassign a collaboration into another tenant's data.
--
-- Only the creator_id rewrite was rejected, and only incidentally.
--
-- WHAT THIS MIGRATION DOES
-- ------------------------
-- 1. Replaces collaborations_update_participant with an owner-only policy:
--    a Creator no longer has UPDATE on collaborations at all. This is safe
--    for the application because the single write path,
--    updateCollaborationStatus() in lib/collaborations/data.ts, is already
--    scoped to business_id = auth.uid(); no Creator code path writes here.
--    Creators keep full SELECT via collaborations_select_participant, which
--    is untouched.
--
-- 2. Adds a BEFORE UPDATE guard freezing the identity columns
--    (application_id, experience_id, creator_id, business_id) and the
--    terminal statuses. RLS is row-level, not column-level, so a policy
--    alone cannot express "you may edit this row but not these columns" —
--    the same reason 003 already guards creator_profiles and
--    business_profiles with protect_*_protected_fields triggers. This guard
--    follows that established pattern, and closes the FK-repointing hole on
--    the Business side too, not just the Creator side.
--
--    Freezing the terminal statuses also makes the completion counter
--    idempotent: fn_on_collaboration_completed increments only on a
--    transition INTO 'completed', so without this guard an owner could
--    cycle completed -> active -> completed and inflate the Creator's
--    counter once per cycle.
--
-- Admin capabilities are unchanged: collaborations_update_admin,
-- _select_admin, _insert_admin and _delete_admin are all left exactly as
-- 004 defined them, and the guard defers to is_admin() the same way the
-- existing protected-column triggers do.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1 — UPDATE is the owning Business's privilege, not "either participant"
-- -----------------------------------------------------------------------------

drop policy if exists collaborations_update_participant on public.collaborations;

-- Completing a collaboration is the Business's decision precisely because it
-- mutates the Creator's reputation counter. A Creator marking their own work
-- complete is self-certification.
create policy collaborations_update_business on public.collaborations
  for update to authenticated
  using (business_id = auth.uid())
  with check (business_id = auth.uid());

comment on policy collaborations_update_business on public.collaborations is
  'Only the owning Business may UPDATE a collaboration. Creators keep SELECT via collaborations_select_participant but have no write access: completion increments the Creator''s protected completed_collaborations_count, so allowing them to drive it would let them inflate their own reputation (see migration 010).';

-- -----------------------------------------------------------------------------
-- 2 — Column-level guard: identity columns and terminal statuses are frozen
-- -----------------------------------------------------------------------------

create or replace function public.protect_collaboration_immutable_fields()
returns trigger
language plpgsql
as $$
begin
  -- Admins and trusted internal writes (SECURITY DEFINER triggers that opted
  -- in for this transaction) are exempt, matching protect_creator_protected_fields.
  if public.is_admin() or public.is_trusted_system_context() then
    return new;
  end if;

  -- Identity of a collaboration is fixed at creation by
  -- fn_create_collaboration_on_acceptance. Nothing in the product ever
  -- legitimately repoints these, and allowing it moves a row between tenants.
  if new.application_id is distinct from old.application_id then
    raise exception 'application_id is immutable on a collaboration' using errcode = '42501';
  end if;
  if new.experience_id is distinct from old.experience_id then
    raise exception 'experience_id is immutable on a collaboration' using errcode = '42501';
  end if;
  if new.creator_id is distinct from old.creator_id then
    raise exception 'creator_id is immutable on a collaboration' using errcode = '42501';
  end if;
  if new.business_id is distinct from old.business_id then
    raise exception 'business_id is immutable on a collaboration' using errcode = '42501';
  end if;

  -- 'completed' and 'cancelled' are terminal. Reopening one and completing it
  -- again would increment the Creator's completed_collaborations_count a
  -- second time, because fn_on_collaboration_completed fires on the
  -- transition into 'completed'. Admin retains the escape hatch above for
  -- genuine corrections.
  if old.status in ('completed', 'cancelled')
     and new.status is distinct from old.status then
    raise exception 'collaboration status % is terminal and cannot be changed', old.status
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.protect_collaboration_immutable_fields() is
  'BEFORE UPDATE guard for collaborations: freezes application_id/experience_id/creator_id/business_id and the terminal statuses. RLS is row-level only, so column immutability needs a trigger — same pattern as protect_creator_protected_fields (003). Admin and trusted system context are exempt.';

drop trigger if exists trg_protect_collaboration_immutable_fields on public.collaborations;

create trigger trg_protect_collaboration_immutable_fields
  before update on public.collaborations
  for each row execute function public.protect_collaboration_immutable_fields();
