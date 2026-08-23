import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/dal';
import {
  getBusinessOnboardingData,
  computeBusinessStep,
  hasSubmittedApplication,
} from '@/lib/onboarding/business';

/** Entry point: always resolves to the correct resume step or /status. */
export default async function BusinessOnboardingIndex() {
  await requireRole('business');
  const data = await getBusinessOnboardingData();
  if (!data) redirect('/business');

  if (hasSubmittedApplication(data)) redirect('/business/onboarding/status');
  redirect(`/business/onboarding/${computeBusinessStep(data)}`);
}
