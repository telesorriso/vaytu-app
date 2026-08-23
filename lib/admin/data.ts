import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/dal';
import { VERIFICATION_EVIDENCE_BUCKET } from '@/lib/storage/paths';
import type {
  CreatorLevelRow,
  CreatorMetricRow,
  CreatorMetricEvidenceRow,
  CreatorProfileRow,
  CreatorVerificationRow,
  BusinessProfileRow,
  BusinessVerificationRow,
  ProfileRow,
} from '@/lib/db/types';

// All queries below run with the admin's own session — no service_role
// anywhere. They only work because RLS explicitly grants admins full read
// (see *_select_admin policies in /supabase/migrations/004_rls_policies.sql);
// requireRole('admin') is the redundant, defense-in-depth check on top.

export interface PendingCreatorRow {
  verification: CreatorVerificationRow;
  creatorProfile: CreatorProfileRow;
  profile: ProfileRow;
}

export async function listPendingCreators(): Promise<PendingCreatorRow[]> {
  await requireRole('admin');
  const supabase = await createClient();

  const { data: verifications } = await supabase
    .from('creator_verifications')
    .select('*')
    .in('status', ['pending', 'in_review'])
    .order('submitted_at', { ascending: true });
  if (!verifications || verifications.length === 0) return [];

  const creatorIds = [...new Set(verifications.map((v) => v.creator_id))];
  const [{ data: creatorProfiles }, { data: profiles }] = await Promise.all([
    supabase.from('creator_profiles').select('*').in('id', creatorIds),
    supabase.from('profiles').select('*').in('id', creatorIds),
  ]);

  const creatorById = new Map((creatorProfiles ?? []).map((c) => [c.id, c as CreatorProfileRow]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p as ProfileRow]));

  return (verifications as CreatorVerificationRow[])
    .filter((v) => creatorById.has(v.creator_id) && profileById.has(v.creator_id))
    .map((v) => ({
      verification: v,
      creatorProfile: creatorById.get(v.creator_id)!,
      profile: profileById.get(v.creator_id)!,
    }));
}

export interface CreatorDetail {
  profile: ProfileRow;
  creatorProfile: CreatorProfileRow;
  instagramMetric: CreatorMetricRow | null;
  evidence: (CreatorMetricEvidenceRow & { signedUrl: string | null; kind: string | null })[];
  verifications: CreatorVerificationRow[];
  levels: CreatorLevelRow[];
}

export async function getCreatorDetail(creatorId: string): Promise<CreatorDetail | null> {
  await requireRole('admin');
  const supabase = await createClient();

  const [{ data: profile }, { data: creatorProfile }, { data: metrics }, { data: verifications }, { data: levels }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', creatorId).maybeSingle(),
      supabase.from('creator_profiles').select('*').eq('id', creatorId).maybeSingle(),
      supabase
        .from('creator_metrics')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('platform', 'instagram')
        .order('recorded_at', { ascending: false })
        .limit(1),
      supabase
        .from('creator_verifications')
        .select('*')
        .eq('creator_id', creatorId)
        .order('submitted_at', { ascending: false }),
      supabase.from('creator_levels').select('*').order('sort_order', { ascending: true }),
    ]);

  if (!profile || !creatorProfile) return null;

  const instagramMetric = (metrics?.[0] as CreatorMetricRow | undefined) ?? null;

  let evidence: CreatorDetail['evidence'] = [];
  if (instagramMetric) {
    const { data: evidenceRows } = await supabase
      .from('creator_metric_evidence')
      .select('*')
      .eq('metric_id', instagramMetric.id);

    evidence = await Promise.all(
      ((evidenceRows as CreatorMetricEvidenceRow[] | null) ?? []).map(async (row) => {
        const { data: signed } = await supabase.storage
          .from(VERIFICATION_EVIDENCE_BUCKET)
          .createSignedUrl(row.storage_path, 60 * 10);
        const kind = row.storage_path.match(/\/metrics\/([a-z]+)\./)?.[1] ?? null;
        return { ...row, signedUrl: signed?.signedUrl ?? null, kind };
      })
    );
  }

  return {
    profile: profile as ProfileRow,
    creatorProfile: creatorProfile as CreatorProfileRow,
    instagramMetric,
    evidence,
    verifications: (verifications as CreatorVerificationRow[] | null) ?? [],
    levels: (levels as CreatorLevelRow[] | null) ?? [],
  };
}

export interface PendingBusinessRow {
  verification: BusinessVerificationRow;
  businessProfile: BusinessProfileRow;
  profile: ProfileRow;
}

export async function listPendingBusinesses(): Promise<PendingBusinessRow[]> {
  await requireRole('admin');
  const supabase = await createClient();

  const { data: verifications } = await supabase
    .from('business_verifications')
    .select('*')
    .in('status', ['pending', 'in_review'])
    .order('submitted_at', { ascending: true });
  if (!verifications || verifications.length === 0) return [];

  const businessIds = [...new Set(verifications.map((v) => v.business_id))];
  const [{ data: businessProfiles }, { data: profiles }] = await Promise.all([
    supabase.from('business_profiles').select('*').in('id', businessIds),
    supabase.from('profiles').select('*').in('id', businessIds),
  ]);

  const businessById = new Map((businessProfiles ?? []).map((b) => [b.id, b as BusinessProfileRow]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p as ProfileRow]));

  return (verifications as BusinessVerificationRow[])
    .filter((v) => businessById.has(v.business_id) && profileById.has(v.business_id))
    .map((v) => ({
      verification: v,
      businessProfile: businessById.get(v.business_id)!,
      profile: profileById.get(v.business_id)!,
    }));
}

export interface BusinessDetail {
  profile: ProfileRow;
  businessProfile: BusinessProfileRow;
  verifications: BusinessVerificationRow[];
}

export async function getBusinessDetail(businessId: string): Promise<BusinessDetail | null> {
  await requireRole('admin');
  const supabase = await createClient();

  const [{ data: profile }, { data: businessProfile }, { data: verifications }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', businessId).maybeSingle(),
    supabase.from('business_profiles').select('*').eq('id', businessId).maybeSingle(),
    supabase
      .from('business_verifications')
      .select('*')
      .eq('business_id', businessId)
      .order('submitted_at', { ascending: false }),
  ]);

  if (!profile || !businessProfile) return null;

  return {
    profile: profile as ProfileRow,
    businessProfile: businessProfile as BusinessProfileRow,
    verifications: (verifications as BusinessVerificationRow[] | null) ?? [],
  };
}
