import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser, requireRole } from '@/lib/auth/dal';
import {
  EVIDENCE_KINDS,
  type CreatorProfileRow,
  type CreatorMetricRow,
  type CreatorMetricEvidenceRow,
  type CreatorVerificationRow,
  type ProfileRow,
} from '@/lib/db/types';
import { evidenceKindFromPath } from '@/lib/storage/paths';

export const CREATOR_STEPS = [
  'identita',
  'localita',
  'social',
  'evidence',
  'portfolio',
  'riepilogo',
] as const;
export type CreatorStep = (typeof CREATOR_STEPS)[number];

export const CREATOR_STEP_LABELS: Record<CreatorStep, string> = {
  identita: 'Identità',
  localita: 'Località e categorie',
  social: 'Social',
  evidence: 'Evidence',
  portfolio: 'Portfolio',
  riepilogo: 'Riepilogo',
};

export interface CreatorOnboardingData {
  profile: ProfileRow;
  creatorProfile: CreatorProfileRow;
  instagramMetric: CreatorMetricRow | null;
  evidenceKinds: Set<string>;
  latestVerification: CreatorVerificationRow | null;
}

/**
 * Loads everything needed to render/resume the Creator onboarding flow, for
 * the CURRENTLY authenticated user only — every query below is scoped by
 * RLS to the caller's own rows regardless of what we ask for.
 */
export const getCreatorOnboardingData = cache(async (): Promise<CreatorOnboardingData | null> => {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();

  const [{ data: profile }, { data: creatorProfile }, { data: metrics }, { data: verifications }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('creator_profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase
        .from('creator_metrics')
        .select('*')
        .eq('creator_id', user.id)
        .eq('platform', 'instagram')
        .order('recorded_at', { ascending: false })
        .limit(1),
      supabase
        .from('creator_verifications')
        .select('*')
        .eq('creator_id', user.id)
        .order('submitted_at', { ascending: false }),
    ]);

  if (!profile || !creatorProfile) return null;

  const instagramMetric = (metrics?.[0] as CreatorMetricRow | undefined) ?? null;

  let evidenceKinds = new Set<string>();
  if (instagramMetric) {
    const { data: evidence } = await supabase
      .from('creator_metric_evidence')
      .select('storage_path')
      .eq('metric_id', instagramMetric.id);
    evidenceKinds = new Set(
      ((evidence as Pick<CreatorMetricEvidenceRow, 'storage_path'>[] | null) ?? [])
        .map((e) => evidenceKindFromPath(e.storage_path))
        .filter((k): k is string => !!k)
    );
  }

  const latestVerification =
    (verifications?.[0] as CreatorVerificationRow | undefined) ?? null;

  return {
    profile: profile as ProfileRow,
    creatorProfile: creatorProfile as CreatorProfileRow,
    instagramMetric,
    evidenceKinds,
    latestVerification,
  };
});

/** The first step whose prerequisites are NOT yet satisfied. */
export function computeCreatorStep(data: CreatorOnboardingData): CreatorStep {
  const { profile, creatorProfile, instagramMetric, evidenceKinds } = data;

  if (!profile.full_name || !creatorProfile.username || !profile.avatar_url) {
    return 'identita';
  }
  if (!creatorProfile.city || creatorProfile.niches.length === 0) {
    return 'localita';
  }
  if (
    !creatorProfile.instagram_handle ||
    !instagramMetric ||
    instagramMetric.followers_count == null
  ) {
    return 'social';
  }
  if (EVIDENCE_KINDS.some((kind) => !evidenceKinds.has(kind))) {
    return 'evidence';
  }
  if (!creatorProfile.website_url) {
    return 'portfolio';
  }
  return 'riepilogo';
}

/** True once the candidatura has been submitted (a verification row exists). */
export function hasSubmittedApplication(data: CreatorOnboardingData): boolean {
  return data.latestVerification !== null;
}

export function stepIndex(step: CreatorStep): number {
  return CREATOR_STEPS.indexOf(step);
}

/**
 * Authoritative, server-side guard for every onboarding step page: role
 * check, then bounces to /status if already submitted, or to the correct
 * resume step if the caller tries to skip ahead. Steps already completed
 * remain visitable (index <= canonical) so the user can go back and edit.
 */
export async function guardCreatorStep(step: CreatorStep): Promise<CreatorOnboardingData> {
  await requireRole('creator');

  const data = await getCreatorOnboardingData();
  if (!data) redirect('/creator');
  if (hasSubmittedApplication(data)) redirect('/creator/onboarding/status');

  const canonical = computeCreatorStep(data);
  if (stepIndex(step) > stepIndex(canonical)) {
    redirect(`/creator/onboarding/${canonical}`);
  }

  return data;
}
