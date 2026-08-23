import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/dal';
import { getBusinessOnboardingData, hasSubmittedApplication } from '@/lib/onboarding/business';
import { logout } from '@/app/auth/actions';

export default async function BusinessDashboard() {
  const profile = await requireRole('business');

  const data = await getBusinessOnboardingData();
  if (!data || !hasSubmittedApplication(data)) {
    redirect('/business/onboarding');
  }
  if (data.latestVerification!.status !== 'verified') {
    redirect('/business/onboarding/status');
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Dashboard Business
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Ciao, {profile.fullName}. Attività verificata. Gestione Experiences
        non ancora implementata.
      </p>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Esci
        </button>
      </form>
    </div>
  );
}
