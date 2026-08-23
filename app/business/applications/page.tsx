import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/dal';
import { getBusinessOnboardingData, hasSubmittedApplication } from '@/lib/onboarding/business';
import { getBusinessApplications } from '@/lib/experiences/data';

export default async function BusinessApplicationsPage() {
  const _profile = await requireRole('business');

  // Check if business has completed onboarding and been verified
  const data = await getBusinessOnboardingData();
  if (!data || !hasSubmittedApplication(data)) {
    redirect('/business/onboarding');
  }
  if (data.latestVerification!.status !== 'verified') {
    redirect('/business/onboarding/status');
  }

  // Load applications
  const applications = await getBusinessApplications();

  const pendingApps = applications.filter((a) => a.status === 'pending');
  const acceptedApps = applications.filter((a) => a.status === 'accepted');
  const rejectedApps = applications.filter((a) => a.status === 'rejected');

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-6 py-8 dark:bg-black">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50">
            Candidature ricevute
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Gestisci le candidature dei Creator alle tue Experiences.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingApps.length}</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">In attesa di risposta</div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{acceptedApps.length}</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Accettate</div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{rejectedApps.length}</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Rifiutate</div>
          </div>
        </div>

        {/* Pending applications section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
            In attesa ({pendingApps.length})
          </h2>

          {pendingApps.length === 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-zinc-600 dark:text-zinc-400">Nessuna candidatura in attesa</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApps.map((app) => (
                <Link
                  key={app.id}
                  href={`/business/applications/${app.id}`}
                  className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 hover:border-blue-300 hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-700 dark:hover:bg-zinc-800 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-zinc-950 dark:text-zinc-50">
                      Candidatura #{app.id.slice(0, 8)}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Creator ID: {app.creator_id.slice(0, 8)}
                    </p>
                    {app.message && (
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-700 dark:text-zinc-300">
                        {app.message}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-zinc-600 dark:text-zinc-400">
                    <div>
                      {new Date(app.created_at).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Accepted section */}
        {acceptedApps.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              Accettate ({acceptedApps.length})
            </h2>
            <div className="space-y-3">
              {acceptedApps.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 dark:text-green-100">
                      Candidatura accettata
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Creator ID: {app.creator_id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="text-right text-sm text-green-700 dark:text-green-300">
                    <div>
                      {new Date(app.created_at).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejected section */}
        {rejectedApps.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              Rifiutate ({rejectedApps.length})
            </h2>
            <div className="space-y-3">
              {rejectedApps.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 dark:text-red-100">
                      Candidatura rifiutata
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Creator ID: {app.creator_id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="text-right text-sm text-red-700 dark:text-red-300">
                    <div>
                      {new Date(app.created_at).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
