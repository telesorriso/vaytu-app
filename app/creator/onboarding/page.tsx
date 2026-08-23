import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/dal';
import {
  getCreatorOnboardingData,
  computeCreatorStep,
  hasSubmittedApplication,
} from '@/lib/onboarding/creator';

/** Entry point: always resolves to the correct resume step or /status. */
export default async function CreatorOnboardingIndex() {
  await requireRole('creator');
  const data = await getCreatorOnboardingData();
  if (!data) redirect('/creator');

  if (hasSubmittedApplication(data)) redirect('/creator/onboarding/status');
  redirect(`/creator/onboarding/${computeCreatorStep(data)}`);
}
