-- =============================================================================
-- VAYTU — Migration 007: Onboarding profile fields (additive only)
-- =============================================================================
-- Purpose : Add the handful of nullable columns the Creator/Business
--           onboarding flows need and that have no home in the existing
--           schema (001-006). Strictly additive: no drops, no renames, no
--           behavior change to existing rows or policies.
--
--           Why this is safe without touching RLS: profiles_update_self /
--           creator_profiles_update_self / business_profiles_update_self
--           (004_rls_policies.sql) already grant the owner UPDATE on their
--           whole row; new nullable columns are covered automatically. None
--           of these columns are in the protected-field trigger allowlists
--           (protect_creator_protected_fields / protect_business_protected_fields,
--           003_indexes_constraints_triggers.sql), so owners can set them
--           freely — correct, since these are plain profile facts, not
--           admin-controlled state.
-- Order   : Run AFTER 001-006.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- creator_profiles: username + social handles
-- -----------------------------------------------------------------------------
alter table public.creator_profiles
  add column username text,
  add column instagram_handle text,
  add column tiktok_handle text;

alter table public.creator_profiles
  add constraint creator_profiles_username_unique unique (username);

comment on column public.creator_profiles.username is
  'Public @handle chosen by the creator on VAYTU (distinct from any social platform handle). Nullable until onboarding sets it; unique when set.';
comment on column public.creator_profiles.instagram_handle is
  'Instagram @handle (without the leading @), self-reported at onboarding.';
comment on column public.creator_profiles.tiktok_handle is
  'TikTok @handle (without the leading @), self-reported at onboarding. Optional.';

-- -----------------------------------------------------------------------------
-- business_profiles: address + Instagram handle + cover image
-- -----------------------------------------------------------------------------
alter table public.business_profiles
  add column address text,
  add column instagram_handle text,
  add column cover_image_url text;

comment on column public.business_profiles.address is
  'Street address (city/country already existed as separate columns).';
comment on column public.business_profiles.instagram_handle is
  'Instagram @handle (without the leading @), self-reported at onboarding.';
comment on column public.business_profiles.cover_image_url is
  'Storage path/URL of the cover image shown on the business public profile (logo_url already existed separately).';
