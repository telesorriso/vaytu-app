import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/dal';
import { getBusinessOnboardingData, hasSubmittedApplication } from '@/lib/onboarding/business';
import { ExperienceForm } from '../experience-form';
import { submitCreateExperience } from '../actions';

export default async function CreateExperiencePage() {
  await requireRole('business');

  // Check if business has completed onboarding and been verified
  const data = await getBusinessOnboardingData();
  if (!data || !hasSubmittedApplication(data)) {
    redirect('/business/onboarding');
  }
  if (data.latestVerification!.status !== 'verified') {
    redirect('/business/onboarding/status');
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-6 py-8 dark:bg-black">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50">
            Nuova Experience
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Crea un&apos;offerta interessante per attirare i Creator più talentuosi.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <ExperienceForm action={submitCreateExperience} />
        </div>
      </div>
    </div>
  );
}
