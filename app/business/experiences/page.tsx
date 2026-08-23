import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/dal';
import { getBusinessOnboardingData, hasSubmittedApplication } from '@/lib/onboarding/business';
import { listBusinessExperiences } from '@/lib/experiences/data';
import { logout } from '@/app/auth/actions';

export default async function BusinessExperiencesPage() {
  const _profile = await requireRole('business');

  // Check if business has completed onboarding and been verified
  const data = await getBusinessOnboardingData();
  if (!data || !hasSubmittedApplication(data)) {
    redirect('/business/onboarding');
  }
  if (data.latestVerification!.status !== 'verified') {
    redirect('/business/onboarding/status');
  }

  // Load experiences
  const experiences = await listBusinessExperiences();

  const draftCount = experiences.filter((e) => e.status === 'draft').length;
  const publishedCount = experiences.filter((e) => e.status === 'published').length;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-6 py-8 dark:bg-black">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50">
              Le tue Experiences
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Ciao, {data.businessProfile.company_name}. Gestisci le tue offerte per i Creator.
            </p>
          </div>
          <Link
            href="/business/experiences/create"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            + Nuova Experience
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">{experiences.length}</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Totale</div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{publishedCount}</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Pubblicate</div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{draftCount}</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Bozze</div>
          </div>
        </div>

        {/* List */}
        {experiences.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-zinc-600 dark:text-zinc-400">
              Nessuna experience ancora. Crea la prima per attirare i Creator!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {experiences.map((experience) => (
              <Link
                key={experience.id}
                href={`/business/experiences/${experience.id}`}
                className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 hover:border-blue-300 hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-700 dark:hover:bg-zinc-800 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-950 dark:text-zinc-50">{experience.title}</h3>
                  <p className="line-clamp-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {experience.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {experience.category || 'Senza categoria'}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
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
                </div>
                <div className="text-right text-sm text-zinc-600 dark:text-zinc-400">
                  {experience.city && <div>{experience.city}</div>}
                  <div className="text-xs">
                    {new Date(experience.created_at).toLocaleDateString('it-IT')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer with logout */}
      <div className="mt-8 flex justify-center border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Esci
          </button>
        </form>
      </div>
    </div>
  );
}
