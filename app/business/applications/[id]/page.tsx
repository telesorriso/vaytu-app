import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/dal';
import { getBusinessOnboardingData, hasSubmittedApplication } from '@/lib/onboarding/business';
import { getApplicationDetail, getExperienceDetail } from '@/lib/experiences/data';
import { ActionButtons } from './action-buttons';

interface ApplicationDetailPageProps {
  params: { id: string };
}

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  await requireRole('business');

  // Check if business has completed onboarding and been verified
  const data = await getBusinessOnboardingData();
  if (!data || !hasSubmittedApplication(data)) {
    redirect('/business/onboarding');
  }
  if (data.latestVerification!.status !== 'verified') {
    redirect('/business/onboarding/status');
  }

  // Load application
  const application = await getApplicationDetail(params.id);
  if (!application) {
    redirect('/business/applications');
  }

  // Load experience details
  const experience = await getExperienceDetail(application.experience_id);
  if (!experience) {
    redirect('/business/applications');
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/business/applications"
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Torna alle candidature
        </Link>
      </div>

      {/* Status and actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50">
            Candidatura a &quot;{experience.title}&quot;
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                application.status === 'pending'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                  : application.status === 'accepted'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              }`}
            >
              {application.status === 'pending'
                ? 'In attesa'
                : application.status === 'accepted'
                  ? 'Accettata'
                  : 'Rifiutata'}
            </span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {new Date(application.created_at).toLocaleDateString('it-IT', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {application.status === 'pending' && <ActionButtons applicationId={application.id} />}
      </div>

      {/* Creator info and message */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Message */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              Messaggio del Creator
            </h2>
            <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
              {application.message || '(Nessun messaggio)'}
            </p>
          </div>

          {/* Experience details */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              Experience
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Titolo</dt>
                <dd className="text-zinc-700 dark:text-zinc-300">{experience.title}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Categoria</dt>
                <dd className="text-zinc-700 dark:text-zinc-300">{experience.category || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Compenso</dt>
                <dd className="text-zinc-700 dark:text-zinc-300">
                  {experience.compensation_type === 'paid'
                    ? `€${experience.compensation_value}`
                    : experience.compensation_type
                        .split('_')
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ')}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Creator card */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Profilo Creator
          </h3>

          {application.creatorProfile?.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={application.creatorProfile.avatar_url}
              alt={application.creatorProfile.display_name}
              className="mb-4 h-20 w-20 rounded-lg object-cover"
            />
          )}

          <h4 className="font-semibold text-zinc-950 dark:text-zinc-50">
            {application.creatorProfile?.display_name || 'Creator'}
          </h4>

          {application.creatorProfile?.city && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              📍 {application.creatorProfile.city}
            </p>
          )}

          {application.creatorProfile?.niches && application.creatorProfile.niches.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">
                Nicchie
              </p>
              <div className="flex flex-wrap gap-1">
                {application.creatorProfile.niches.map((niche) => (
                  <span
                    key={niche}
                    className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {niche}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
