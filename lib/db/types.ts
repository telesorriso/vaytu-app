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
