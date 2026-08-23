-- =============================================================================
-- VAYTU — Migration 001: Enum types
-- =============================================================================
-- Purpose : Create every PostgreSQL ENUM type used by the VAYTU schema.
-- Order   : Must run FIRST on an empty database (before 002/003/004).
-- Notes   : UUID primary keys rely on gen_random_uuid(), built into
--           PostgreSQL core since v13 (Supabase runs >= v15), so no
--           extension (pgcrypto / uuid-ossp) needs to be enabled here.
-- =============================================================================

-- Application-level role. Mirrors, but is independent from, Supabase's
-- Postgres-level roles (anon / authenticated / service_role). This enum is
-- the *business* role stored on public.profiles.role.
create type public.app_role as enum (
  'creator',
  'business',
  'admin'
);

-- Generic verification status, reused by creator_verifications,
-- business_verifications and the denormalized *_profiles.verification_status
-- cache columns.
create type public.verification_status as enum (
  'unverified',
  'pending',
  'in_review',
  'verified',
  'rejected'
);

-- Social platforms tracked for creator metrics and content submissions.
create type public.platform_type as enum (
  'instagram',
  'tiktok',
  'youtube',
  'facebook',
  'x',
  'linkedin',
  'other'
);

-- Provenance of a metric value (follower counts, engagement, views, ...).
create type public.metric_source as enum (
  'self_reported',
  'verified',
  'admin_override'
);

-- Lifecycle of an Experience listing published by a Business.
create type public.experience_status as enum (
  'draft',
  'published',
  'paused',
  'closed',
  'archived'
);

-- How a Creator is compensated for an Experience.
create type public.compensation_type as enum (
  'free_stay',
  'free_product',
  'paid',
  'paid_plus_product',
  'other'
);

-- Lifecycle of a Creator's Application to an Experience.
create type public.application_status as enum (
  'pending',
  'accepted',
  'rejected',
  'withdrawn',
  'expired'
);

-- Lifecycle of a Collaboration (created once an Application is accepted).
create type public.collaboration_status as enum (
  'active',
  'completed',
  'cancelled',
  'disputed'
);

-- Type of content a Collaboration Deliverable expects.
create type public.deliverable_type as enum (
  'instagram_post',
  'instagram_reel',
  'instagram_story',
  'tiktok_video',
  'youtube_video',
  'blog_post',
  'other'
);

-- Lifecycle of a single Collaboration Deliverable.
create type public.deliverable_status as enum (
  'pending',
  'submitted',
  'approved',
  'revision_requested',
  'rejected'
);

-- Lifecycle of a Content Submission (proof of a delivered piece of content).
create type public.submission_status as enum (
  'pending_review',
  'approved',
  'rejected'
);

-- Direction of a Review between the two parties of a Collaboration.
create type public.review_type as enum (
  'creator_to_business',
  'business_to_creator'
);

-- Notification categories surfaced to end users.
create type public.notification_type as enum (
  'application_received',
  'application_accepted',
  'application_rejected',
  'collaboration_started',
  'collaboration_completed',
  'deliverable_due',
  'submission_reviewed',
  'verification_update',
  'review_received',
  'system'
);

-- Action recorded by the append-only audit log.
create type public.audit_action as enum (
  'insert',
  'update',
  'delete'
);
