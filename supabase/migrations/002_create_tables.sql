-- =============================================================================
-- VAYTU — Migration 002: Tables
-- =============================================================================
-- Purpose : Create every table of the VAYTU MVP schema (20 entities).
-- Order   : Run AFTER 001_init_enums.sql, BEFORE 003/004.
-- Notes   : - All primary keys are UUID (gen_random_uuid(), core since PG13).
--           - profiles.id references auth.users(id): the standard Supabase
--             pattern of a 1:1 "public profile" row per authenticated user.
--           - creator_profiles.id / business_profiles.id reuse profiles.id
--             as their own primary key (shared-PK inheritance), so a given
--             auth user is a Creator XOR a Business, matching profiles.role.
--           - Several tables (applications, collaborations,
--             content_submissions) intentionally denormalize creator_id /
--             business_id even though they are reachable via a join, purely
--             to keep Row Level Security policies simple, fast and free of
--             cross-table joins. See /docs/DATABASE.md ("Denormalization").
--           - No indexes, extra CHECK constraints, triggers, or RLS here:
--             those live in 003 and 004 respectively.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles — one row per authenticated user (Creator, Business or Admin)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         public.app_role not null,
  email        text not null,
  full_name    text not null,
  phone        text,
  avatar_url   text,
  locale       text not null default 'it',
  is_active    boolean not null default true,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.profiles is
  'One row per authenticated user. Holds identity/contact data shared by every role. Soft-delete via deleted_at (see /docs/SECURITY_MODEL.md — soft delete is NOT automatically GDPR compliant).';

-- -----------------------------------------------------------------------------
-- creator_levels — "Vaytu Level" lookup/reference table (Bronze/Silver/...)
-- -----------------------------------------------------------------------------
create table public.creator_levels (
  id                         uuid primary key default gen_random_uuid(),
  code                       text not null unique,
  name                       text not null,
  description                text,
  sort_order                 int not null unique,
  min_reliability_score      numeric(5,2),
  min_completed_collaborations int,
  badge_icon                 text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);
comment on table public.creator_levels is
  'Reference table describing the Vaytu Level ladder. Admin-managed only.';

-- -----------------------------------------------------------------------------
-- creator_profiles — Creator-specific extension of profiles
-- -----------------------------------------------------------------------------
create table public.creator_profiles (
  id                             uuid primary key references public.profiles (id) on delete cascade,
  display_name                   text not null,
  bio                             text,
  birth_date                     date,
  city                            text,
  country                         text,
  niches                          text[] not null default '{}',
  website_url                     text,
  current_level_id                uuid references public.creator_levels (id),
  reliability_score                numeric(5,2) not null default 0,
  verification_status              public.verification_status not null default 'unverified',
  completed_collaborations_count   int not null default 0,
  onboarding_completed             boolean not null default false,
  created_at                       timestamptz not null default now(),
  updated_at                       timestamptz not null default now()
);
comment on table public.creator_profiles is
  'Creator-specific profile data. current_level_id, reliability_score, verification_status and completed_collaborations_count are system/admin controlled (see protect_creator_protected_fields trigger in 003).';

-- -----------------------------------------------------------------------------
-- business_profiles — Business-specific extension of profiles
-- -----------------------------------------------------------------------------
create table public.business_profiles (
  id                    uuid primary key references public.profiles (id) on delete cascade,
  company_name          text not null,
  vat_number            text,
  description           text,
  website_url           text,
  industry              text,
  city                  text,
  country               text,
  logo_url              text,
  verification_status   public.verification_status not null default 'unverified',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
comment on table public.business_profiles is
  'Business-specific profile data. verification_status is system/admin controlled.';

-- -----------------------------------------------------------------------------
-- creator_metrics — self-reported / verified social metrics per platform
-- -----------------------------------------------------------------------------
create table public.creator_metrics (
  id                uuid primary key default gen_random_uuid(),
  creator_id        uuid not null references public.creator_profiles (id) on delete cascade,
  platform          public.platform_type not null,
  followers_count   bigint,
  following_count   bigint,
  engagement_rate   numeric(6,3),
  avg_views         bigint,
  avg_likes         bigint,
  source            public.metric_source not null default 'self_reported',
  is_verified       boolean not null default false,
  verified_by       uuid references public.profiles (id),
  verified_at       timestamptz,
  period_start      date,
  period_end        date,
  recorded_at       timestamptz not null default now(),
  created_at        timestamptz not null default now()
);
comment on table public.creator_metrics is
  'Profile-level social metrics declared by a Creator. is_verified/verified_by/verified_at are admin-only. Businesses may read these (aggregate numbers) but never the raw evidence in creator_metric_evidence.';

-- -----------------------------------------------------------------------------
-- creator_metric_evidence — private proof files backing a creator_metrics row
-- -----------------------------------------------------------------------------
create table public.creator_metric_evidence (
  id            uuid primary key default gen_random_uuid(),
  metric_id     uuid not null references public.creator_metrics (id) on delete cascade,
  creator_id    uuid not null references public.creator_profiles (id) on delete cascade,
  storage_path  text not null,
  file_type     text,
  uploaded_at   timestamptz not null default now()
);
comment on table public.creator_metric_evidence is
  'Private evidence (e.g. Instagram Insights screenshots) stored as a Supabase Storage path, never as raw bytes. Visible ONLY to the owning creator and admins — never to Businesses or other Creators.';

-- -----------------------------------------------------------------------------
-- creator_verifications — identity/creator verification requests
-- -----------------------------------------------------------------------------
create table public.creator_verifications (
  id                uuid primary key default gen_random_uuid(),
  creator_id        uuid not null references public.creator_profiles (id) on delete cascade,
  document_type     text not null,
  storage_path      text,
  status            public.verification_status not null default 'pending',
  submitted_at      timestamptz not null default now(),
  reviewed_by       uuid references public.profiles (id),
  reviewed_at       timestamptz,
  rejection_reason  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on table public.creator_verifications is
  'Creator identity verification requests + evidence. Evidence/status visible to owning creator (status only, no cross-editing) and admin. Businesses never see this table.';

-- -----------------------------------------------------------------------------
-- business_verifications — company verification requests
-- -----------------------------------------------------------------------------
create table public.business_verifications (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.business_profiles (id) on delete cascade,
  document_type     text not null,
  storage_path      text,
  status            public.verification_status not null default 'pending',
  submitted_at      timestamptz not null default now(),
  reviewed_by       uuid references public.profiles (id),
  reviewed_at       timestamptz,
  rejection_reason  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on table public.business_verifications is
  'Business verification requests + evidence (e.g. company registration). Visible to owning business and admin only.';

-- -----------------------------------------------------------------------------
-- experiences — listings published by a Business
-- -----------------------------------------------------------------------------
create table public.experiences (
  id                     uuid primary key default gen_random_uuid(),
  business_id            uuid not null references public.business_profiles (id) on delete cascade,
  title                  text not null,
  description            text not null,
  category               text,
  city                   text,
  country                text,
  compensation_type      public.compensation_type not null,
  compensation_value     numeric(10,2),
  compensation_details   text,
  requirements           text,
  min_level_id           uuid references public.creator_levels (id),
  max_creators           int not null default 1,
  status                 public.experience_status not null default 'draft',
  application_deadline   timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz
);
comment on table public.experiences is
  'An offer published by a Business for Creators to apply to. Only status=published rows are publicly discoverable.';

-- -----------------------------------------------------------------------------
-- experience_images — gallery images for an experience
-- -----------------------------------------------------------------------------
create table public.experience_images (
  id             uuid primary key default gen_random_uuid(),
  experience_id  uuid not null references public.experiences (id) on delete cascade,
  storage_path   text not null,
  is_cover       boolean not null default false,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);
comment on table public.experience_images is
  'Gallery images belonging to an experience, stored as Supabase Storage paths.';

-- -----------------------------------------------------------------------------
-- experience_slots — bookable date ranges for an experience
-- -----------------------------------------------------------------------------
create table public.experience_slots (
  id             uuid primary key default gen_random_uuid(),
  experience_id  uuid not null references public.experiences (id) on delete cascade,
  start_date     date not null,
  end_date       date not null,
  capacity       int not null default 1,
  booked_count   int not null default 0,
  created_at     timestamptz not null default now()
);
comment on table public.experience_slots is
  'Bookable date windows for an experience. booked_count is maintained by triggers when a Collaboration is created (see 003).';

-- -----------------------------------------------------------------------------
-- applications — a Creator applying to an Experience (optionally a slot)
-- -----------------------------------------------------------------------------
create table public.applications (
  id                uuid primary key default gen_random_uuid(),
  experience_id     uuid not null references public.experiences (id) on delete cascade,
  slot_id           uuid references public.experience_slots (id) on delete set null,
  creator_id        uuid not null references public.creator_profiles (id) on delete cascade,
  business_id       uuid not null references public.business_profiles (id) on delete cascade,
  status            public.application_status not null default 'pending',
  message           text,
  decided_at        timestamptz,
  decided_by        uuid references public.profiles (id),
  decision_reason   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on table public.applications is
  'A Creator application to an Experience. business_id is denormalized from experiences.business_id purely to keep RLS policies join-free.';

-- -----------------------------------------------------------------------------
-- collaborations — created once an application is accepted
-- -----------------------------------------------------------------------------
create table public.collaborations (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null unique references public.applications (id) on delete cascade,
  experience_id   uuid not null references public.experiences (id) on delete cascade,
  creator_id      uuid not null references public.creator_profiles (id) on delete cascade,
  business_id     uuid not null references public.business_profiles (id) on delete cascade,
  status          public.collaboration_status not null default 'active',
  start_date      date,
  end_date        date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.collaborations is
  'A confirmed Creator<->Business partnership. Normally created automatically by a trigger when an application transitions to accepted (see 003).';

-- -----------------------------------------------------------------------------
-- collaboration_deliverables — content items expected within a collaboration
-- -----------------------------------------------------------------------------
create table public.collaboration_deliverables (
  id                 uuid primary key default gen_random_uuid(),
  collaboration_id   uuid not null references public.collaborations (id) on delete cascade,
  deliverable_type   public.deliverable_type not null,
  description        text,
  due_date           date,
  status             public.deliverable_status not null default 'pending',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
comment on table public.collaboration_deliverables is
  'A single expected content item (e.g. one Reel) within a collaboration.';

-- -----------------------------------------------------------------------------
-- content_submissions — creator's proof of a delivered piece of content
-- -----------------------------------------------------------------------------
create table public.content_submissions (
  id                uuid primary key default gen_random_uuid(),
  deliverable_id    uuid not null references public.collaboration_deliverables (id) on delete cascade,
  collaboration_id  uuid not null references public.collaborations (id) on delete cascade,
  creator_id        uuid not null references public.creator_profiles (id) on delete cascade,
  business_id       uuid not null references public.business_profiles (id) on delete cascade,
  content_url       text not null,
  platform          public.platform_type not null,
  caption           text,
  status            public.submission_status not null default 'pending_review',
  reviewed_by       uuid references public.profiles (id),
  reviewed_at       timestamptz,
  review_notes      text,
  submitted_at      timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on table public.content_submissions is
  'Proof of published content for a deliverable. Visible to the involved creator, the involved business, and admins. Unlike creator_metric_evidence, this IS meant to be seen by the counterpart business (it is the deliverable itself).';

-- -----------------------------------------------------------------------------
-- submission_metrics — performance numbers for a content submission
-- -----------------------------------------------------------------------------
create table public.submission_metrics (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references public.content_submissions (id) on delete cascade,
  views          bigint,
  likes          bigint,
  comments       bigint,
  shares         bigint,
  saves          bigint,
  reach          bigint,
  source         public.metric_source not null default 'self_reported',
  is_verified    boolean not null default false,
  recorded_at    timestamptz not null default now(),
  created_at     timestamptz not null default now()
);
comment on table public.submission_metrics is
  'Performance metrics of one content submission (e.g. views/likes of a published Reel). Visible to creator, business and admin.';

-- -----------------------------------------------------------------------------
-- reviews — post-collaboration rating between the two parties
-- -----------------------------------------------------------------------------
create table public.reviews (
  id                uuid primary key default gen_random_uuid(),
  collaboration_id  uuid not null references public.collaborations (id) on delete cascade,
  reviewer_id       uuid not null references public.profiles (id) on delete cascade,
  reviewee_id       uuid not null references public.profiles (id) on delete cascade,
  review_type       public.review_type not null,
  rating            smallint not null,
  comment           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint reviews_rating_range check (rating between 1 and 5),
  constraint reviews_reviewer_not_reviewee check (reviewer_id <> reviewee_id),
  constraint reviews_one_per_collaboration_per_reviewer unique (collaboration_id, reviewer_id)
);
comment on table public.reviews is
  'A 1-5 rating + comment left by one collaboration party about the other. Visible to reviewer, reviewee and admin only (no public directory in the MVP).';

-- -----------------------------------------------------------------------------
-- notifications — in-app notifications per user
-- -----------------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        public.notification_type not null,
  title       text not null,
  body        text,
  payload     jsonb not null default '{}'::jsonb,
  is_read     boolean not null default false,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
comment on table public.notifications is
  'In-app notifications. Rows are created by trusted server-side triggers/functions, never inserted directly by clients.';

-- -----------------------------------------------------------------------------
-- admin_notes — internal, polymorphic notes attached to any entity
-- -----------------------------------------------------------------------------
create table public.admin_notes (
  id            uuid primary key default gen_random_uuid(),
  target_table  text not null,
  target_id     uuid not null,
  author_id     uuid not null references public.profiles (id),
  note          text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.admin_notes is
  'Internal admin-only notes attached polymorphically (target_table + target_id) to any record. Never visible to Creators or Businesses.';

-- -----------------------------------------------------------------------------
-- audit_log — append-only system audit trail
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.profiles (id),
  action       public.audit_action not null,
  table_name   text not null,
  record_id    uuid,
  old_data     jsonb,
  new_data     jsonb,
  created_at   timestamptz not null default now()
);
comment on table public.audit_log is
  'Append-only audit trail populated exclusively by SECURITY DEFINER trigger functions (see 003). No client (anon/authenticated) role ever has INSERT/UPDATE/DELETE privileges on this table — see 004.';
