import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/dal';
import { getBusinessOnboardingData, hasSubmittedApplication } from '@/lib/onboarding/business';
import { getExperienceDetail } from '@/lib/experiences/data';
import { ExperienceForm } from '../experience-form';
import { StatusButton } from './status-button';
import { submitUpdateExperience } from '../actions';

interface ExperienceDetailPageProps {
  params: { id: string };
}

export default async function ExperienceDetailPage({ params }: ExperienceDetailPageProps) {
  await requireRole('business');

  // Check if business has completed onboarding and been verified
  const data = await getBusinessOnboardingData();
  if (!data || !hasSubmittedApplication(data)) {
    redirect('/business/onboarding');
  }
  if (data.latestVerification!.status !== 'verified') {
    redirect('/business/onboarding/status');
  }

  // Load experience
  const experience = await getExperienceDetail(params.id);
  if (!experience) {
    redirect('/business/experiences');
  }

  // After redirect check, experience is guaranteed to be non-null
  const experienceId = experience.id;

  // Create wrapped action for this experience
  async function handleUpdate(
    prevState: { error?: string; success?: boolean },
    formData: FormData
  ) {
    'use server';
    return submitUpdateExperience(experienceId, prevState, formData);
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-6 py-8 dark:bg-black">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Header with back link */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/business/experiences"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← Indietro
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50">
                {experience.title}
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Stato: <span className="font-medium">{experience.status}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Status badge and actions */}
        <div className="flex flex-wrap gap-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex-1">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                experience.status === 'published'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : experience.status === 'draft'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                    : experience.status === 'paused'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              {experience.status === 'published'
                ? 'Pubblicata'
                : experience.status === 'draft'
                  ? 'Bozza'
                  : experience.status === 'paused'
                    ? 'In pausa'
                    : experience.status}
            </span>
          </div>
          <div className="flex gap-2">
            <StatusButton experienceId={experience.id} currentStatus={experience.status} />
          </div>
        </div>

        {/* Edit form */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-6 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Modifica Experience
          </h2>
          <ExperienceForm initialData={experience} action={handleUpdate} />
        </div>

        {/* Info */}
        <div className="grid gap-4 sm:grid-cols-2 text-sm text-zinc-600 dark:text-zinc-400">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="font-semibold text-zinc-950 dark:text-zinc-50">Creata</div>
            <div>{new Date(experience.created_at).toLocaleDateString('it-IT')}</div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="font-semibold text-zinc-950 dark:text-zinc-50">Modificata</div>
            <div>{new Date(experience.updated_at).toLocaleDateString('it-IT')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
