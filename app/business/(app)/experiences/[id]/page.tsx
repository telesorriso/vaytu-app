import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/dal';
import { getBusinessOnboardingData, hasSubmittedApplication } from '@/lib/onboarding/business';
import { getExperienceDetail } from '@/lib/experiences/data';
import { ExperienceForm } from '../experience-form';
import { StatusButton } from './status-button';
import { submitUpdateExperience } from '../actions';

interface ExperienceDetailPageProps {
  // Next.js 16 (this repo's version, per AGENTS.md) passes `params` as a
  // Promise at runtime regardless of what an older synchronous type claims.
  // With the previous `{ id: string }` type, `params.id` silently evaluated
  // to undefined (a Promise has no `.id`), getExperienceDetail(undefined)
  // never matched a row, and every card click redirected straight back to
  // the list — the exact "click just re-renders" bug this fixes. Matches
  // the pattern already used correctly in ./report/page.tsx.
  params: Promise<{ id: string }>;
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
  const { id } = await params;
  const experience = await getExperienceDetail(id);
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
    <div className="flex flex-1 flex-col bg-zinc-50 px-4 py-6 md:px-6 md:py-8 dark:bg-black">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Header with back link */}
        <div className="space-y-3">
          <Link
            href="/business/experiences"
            className="inline-block text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← Indietro
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-bold text-zinc-950 md:text-3xl dark:text-zinc-50">
                {experience.title}
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Stato: <span className="font-medium">{experience.status}</span>
              </p>
            </div>
            <Link
              href={`/business/experiences/${experienceId}/report`}
              className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Vedi report
            </Link>
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
