// =============================================================================
// VAYTU — Shared TypeScript types mirroring the Supabase schema
// =============================================================================
// Hand-written (not generated) to stay dependency-free for this phase.
// Keep in sync with /supabase/migrations. See /docs/DATABASE.md.
// =============================================================================

export type VerificationStatus =
  | 'unverified'
  | 'pending'
  | 'in_review'
  | 'verified'
  | 'rejected';

export type PlatformType =
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'facebook'
  | 'x'
  | 'linkedin'
  | 'other';

export type MetricSource = 'self_reported' | 'verified' | 'admin_override';

export interface ProfileRow {
  id: string;
  role: 'creator' | 'business' | 'admin';
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

export interface CreatorProfileRow {
  id: string;
  display_name: string;
  bio: string | null;
  city: string | null;
  country: string | null;
  niches: string[];
  website_url: string | null;
  current_level_id: string | null;
  reliability_score: number;
  verification_status: VerificationStatus;
  completed_collaborations_count: number;
  onboarding_completed: boolean;
  username: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
}

export interface BusinessProfileRow {
  id: string;
  company_name: string;
  description: string | null;
  website_url: string | null;
  industry: string | null;
  city: string | null;
  country: string | null;
  logo_url: string | null;
  verification_status: VerificationStatus;
  address: string | null;
  instagram_handle: string | null;
  cover_image_url: string | null;
}

export interface CreatorLevelRow {
  id: string;
  code: string;
  name: string;
  sort_order: number;
}

export interface CreatorMetricRow {
  id: string;
  creator_id: string;
  platform: PlatformType;
  followers_count: number | null;
  is_verified: boolean;
  source: MetricSource;
}

export interface CreatorMetricEvidenceRow {
  id: string;
  metric_id: string;
  creator_id: string;
  storage_path: string;
  file_type: string | null;
  uploaded_at: string;
}

export interface CreatorVerificationRow {
  id: string;
  creator_id: string;
  document_type: string;
  status: VerificationStatus;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

export interface BusinessVerificationRow {
  id: string;
  business_id: string;
  document_type: string;
  status: VerificationStatus;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

/** The four categories of proof screenshot required at Creator onboarding. */
export const EVIDENCE_KINDS = ['profile', 'reach', 'audience', 'performance'] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const EVIDENCE_KIND_LABELS: Record<EvidenceKind, string> = {
  profile: 'Screenshot profilo',
  reach: 'Screenshot reach',
  audience: 'Screenshot audience geografica',
  performance: 'Screenshot performance recenti',
};

// =============================================================================
// Experience Loop MVP Types
// =============================================================================

export type ExperienceStatus =
  | 'draft'
  | 'published'
  | 'paused'
  | 'closed'
  | 'archived';

export type CompensationType =
  | 'free_stay'
  | 'free_product'
  | 'paid'
  | 'paid_plus_product'
  | 'other';

export type ApplicationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'expired';

export type CollaborationStatus =
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type DeliverableType =
  | 'instagram_post'
  | 'instagram_reel'
  | 'instagram_story'
  | 'tiktok_video'
  | 'youtube_video'
  | 'blog_post'
  | 'other';

export type DeliverableStatus =
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'revision_requested'
  | 'rejected';

export type SubmissionStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected';

export type ReviewType =
  | 'creator_to_business'
  | 'business_to_creator';

export type NotificationType =
  | 'application_received'
  | 'application_accepted'
  | 'application_rejected'
  | 'collaboration_started'
  | 'collaboration_completed'
  | 'deliverable_due'
  | 'submission_reviewed'
  | 'verification_update'
  | 'review_received'
  | 'system';

/**
 * An experience listing published by a Business for Creators to apply to.
 * Only status='published' rows are publicly discoverable via RLS.
 */
export interface ExperienceRow {
  id: string;
  business_id: string;
  title: string;
  description: string;
  category: string | null;
  city: string | null;
  country: string | null;
  compensation_type: CompensationType;
  compensation_value: number | null;
  compensation_details: string | null;
  requirements: string | null;
  min_level_id: string | null;
  max_creators: number;
  status: ExperienceStatus;
  application_deadline: string | null; // ISO 8601 timestamp
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  deleted_at: string | null; // ISO 8601 timestamp
}

/**
 * Gallery images for an experience, stored as Supabase Storage paths.
 */
export interface ExperienceImageRow {
  id: string;
  experience_id: string;
  storage_path: string;
  is_cover: boolean;
  sort_order: number;
  created_at: string; // ISO 8601 timestamp
}

/**
 * Bookable date ranges for an experience. booked_count is maintained by
 * triggers when a Collaboration is created.
 */
export interface ExperienceSlotRow {
  id: string;
  experience_id: string;
  start_date: string; // ISO 8601 date (YYYY-MM-DD)
  end_date: string; // ISO 8601 date (YYYY-MM-DD)
  capacity: number;
  booked_count: number;
  created_at: string; // ISO 8601 timestamp
}

/**
 * A Creator application to an Experience. business_id is denormalized from
 * experiences.business_id purely to keep RLS policies join-free.
 */
export interface ApplicationRow {
  id: string;
  experience_id: string;
  slot_id: string | null;
  creator_id: string;
  business_id: string;
  status: ApplicationStatus;
  message: string | null;
  decided_at: string | null; // ISO 8601 timestamp
  decided_by: string | null;
  decision_reason: string | null;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/**
 * A confirmed Creator<->Business partnership. Normally created automatically
 * by a trigger when an application transitions to 'accepted'. See trigger
 * fn_create_collaboration_on_acceptance() in 003_indexes_constraints_triggers.sql.
 */
export interface CollaborationRow {
  id: string;
  application_id: string;
  experience_id: string;
  creator_id: string;
  business_id: string;
  status: CollaborationStatus;
  start_date: string | null; // ISO 8601 date (YYYY-MM-DD)
  end_date: string | null; // ISO 8601 date (YYYY-MM-DD)
  notes: string | null;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/**
 * A single expected content item within a collaboration (e.g. one Reel).
 * Not used in initial MVP (phases 1-8), but provided for schema completeness.
 */
export interface CollaborationDeliverableRow {
  id: string;
  collaboration_id: string;
  deliverable_type: DeliverableType;
  description: string | null;
  due_date: string | null; // ISO 8601 date (YYYY-MM-DD)
  status: DeliverableStatus;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/**
 * Proof of published content for a deliverable.
 * Not used in initial MVP (phases 1-8), but provided for schema completeness.
 */
export interface ContentSubmissionRow {
  id: string;
  deliverable_id: string;
  collaboration_id: string;
  creator_id: string;
  business_id: string;
  content_url: string;
  platform: PlatformType;
  caption: string | null;
  status: SubmissionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  submitted_at: string; // ISO 8601 timestamp
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/**
 * Performance metrics of one content submission (e.g. views/likes of a published Reel).
 * Not used in initial MVP (phases 1-8), but provided for schema completeness.
 */
export interface SubmissionMetricsRow {
  id: string;
  submission_id: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
  source: MetricSource;
  is_verified: boolean;
  recorded_at: string; // ISO 8601 timestamp
  created_at: string; // ISO 8601 timestamp
}

/**
 * A 1-5 rating + comment left by one collaboration party about the other.
 * Not used in initial MVP (phases 1-8), but provided for schema completeness.
 */
export interface ReviewRow {
  id: string;
  collaboration_id: string;
  reviewer_id: string;
  reviewee_id: string;
  review_type: ReviewType;
  rating: number; // 1-5
  comment: string | null;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/**
 * In-app notifications per user.
 * Not used in initial MVP (phases 1-8), but provided for schema completeness.
 */
export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  payload: Record<string, unknown>; // jsonb in DB
  is_read: boolean;
  read_at: string | null; // ISO 8601 timestamp
  created_at: string; // ISO 8601 timestamp
}
