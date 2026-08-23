import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/dal';
import { getBusinessOnboardingData, hasSubmittedApplication } from '@/lib/onboarding/business';
import { logout } from '@/app/auth/actions';

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  pending: {
    title: 'Verifica in corso',
    body: 'Il team VAYTU sta verificando la tua attività. Ti aggiorneremo appena la revisione è completata.',
  },
  in_review: {
    title: 'Verifica in corso',
    body: 'Il team VAYTU sta verificando la tua attività. Ti aggiorneremo appena la revisione è completata.',
  },
  verified: {
    title: 'Attività verificata',
    body: 'La tua attività è verificata. Le Experiences non sono ancora attive su VAYTU — torna presto.',
  },
  rejected: {
    title: 'Verifica non approvata',
    body: 'La richiesta di verifica non è stata approvata questa volta.',
  },
};

export default async function BusinessOnboardingStatus() {
  await requireRole('business');
  const data = await getBusinessOnboardingData();
  if (!data || !hasSubmittedApplication(data)) redirect('/business/onboarding');

  const status = data.latestVerification!.status;
  const copy = STATUS_COPY[status] ?? STATUS_COPY.pending;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="mb-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">{copy.title}</h1>
      <p className="mb-4 text-sm text-zinc-500">{copy.body}</p>
      {status === 'rejected' && data.latestVerification!.rejection_reason && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Motivo: {data.latestVerification!.rejection_reason}
        </p>
      )}
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
