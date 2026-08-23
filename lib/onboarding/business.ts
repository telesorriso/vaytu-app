import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser, requireRole } from '@/lib/auth/dal';
import { withTimeout } from '@/lib/actions/timeout';
import type {
  BusinessProfileRow,
  BusinessVerificationRow,
  ProfileRow,
} from '@/lib/db/types';

export const BUSINESS_STEPS = [
  'identita',
  'localizzazione',
  'contatti',
  'presentazione',
  'riepilogo',
] as const;
export type BusinessStep = (typeof BUSINESS_STEPS)[number];

export const BUSINESS_STEP_LABELS: Record<BusinessStep, string> = {
  identita: 'Attività',
  localizzazione: 'Localizzazione',
  contatti: 'Contatti',
  presentazione: 'Presentazione',
  riepilogo: 'Riepilogo',
};

export interface BusinessOnboardingData {
  profile: ProfileRow;
  businessProfile: BusinessProfileRow;
  latestVerification: BusinessVerificationRow | null;
}

export async function getBusinessOnboardingData(): Promise<BusinessOnboardingData | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();

  try {
    const [{ data: profile }, { data: businessProfile }, { data: verifications }] =
      await Promise.all([
        withTimeout(supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(), 10_000),
        withTimeout(supabase.from('business_profiles').select('*').eq('id', user.id).maybeSingle(), 10_000),
        withTimeout(
          supabase
            .from('business_verifications')
            .select('*')
            .eq('business_id', user.id)
            .order('submitted_at', { ascending: false }),
          10_000
        ),
      ]);

    if (!profile || !businessProfile) return null;

    const latestVerification =
      (verifications?.[0] as BusinessVerificationRow | undefined) ?? null;

    return {
      profile: profile as ProfileRow,
      businessProfile: businessProfile as BusinessProfileRow,
      latestVerification,
    };
  } catch {
    // Timeout during onboarding data fetch: return null to trigger redirect.
    return null;
  }
}

export function computeBusinessStep(data: BusinessOnboardingData): BusinessStep {
  const { businessProfile, profile } = data;

  if (!businessProfile.company_name || !businessProfile.industry || !businessProfile.logo_url) {
    return 'identita';
  }
  if (!businessProfile.address || !businessProfile.city) {
    return 'localizzazione';
  }
  if (!profile.full_name || !profile.phone || !businessProfile.website_url) {
    return 'contatti';
  }
  if (!businessProfile.description || !businessProfile.cover_image_url) {
    return 'presentazione';
  }
  return 'riepilogo';
}

export function hasSubmittedApplication(data: BusinessOnboardingData): boolean {
  return data.latestVerification !== null;
}

export function stepIndex(step: BusinessStep): number {
  return BUSINESS_STEPS.indexOf(step);
}

/** Same contract as guardCreatorStep() — see /lib/onboarding/creator.ts. */
export async function guardBusinessStep(step: BusinessStep): Promise<BusinessOnboardingData> {
  await requireRole('business');

  const data = await getBusinessOnboardingData();
  if (!data) redirect('/business');
  if (hasSubmittedApplication(data)) redirect('/business/onboarding/status');

  const canonical = computeBusinessStep(data);
  if (stepIndex(step) > stepIndex(canonical)) {
    redirect(`/business/onboarding/${canonical}`);
  }

  return data;
}
