import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/dal';
import { getBusinessOnboardingData, hasSubmittedApplication } from '@/lib/onboarding/business';

export default async function BusinessDashboard() {
  await requireRole('business');

  const data = await getBusinessOnboardingData();
  if (!data || !hasSubmittedApplication(data)) {
    redirect('/business/onboarding');
  }
  if (data.latestVerification!.status !== 'verified') {
    redirect('/business/onboarding/status');
  }

  // Landing destination for a verified Business is the reporting dashboard.
  redirect('/business/dashboard');
}
