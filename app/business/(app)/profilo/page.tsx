import Link from 'next/link';
import { requireRole } from '@/lib/auth/dal';
import { getBusinessOnboardingData } from '@/lib/onboarding/business';
import {
  getBusinessOverviewStats,
  getBusinessReviews,
  getBusinessCollaborationHistory,
} from '@/lib/business/data';
import { logout } from '@/app/auth/actions';

// =============================================================================
// VAYTU — Profilo Business (FASE 6)
// =============================================================================
// Mirrors the Creator profile: identity + verification + real counters +
// reviews received + recent history. Every value comes from the Business's
// own rows; nothing is placeholder text or an invented metric.
// =============================================================================

const STATUS_LABELS: Record<string, string> = {
  active: 'Attiva',
  completed: 'Completata',
  cancelled: 'Annullata',
  disputed: 'In contestazione',
};

export default async function BusinessProfiloPage() {
  await requireRole('business');

  const data = await getBusinessOnboardingData();
  if (!data) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Non riusciamo a caricare il tuo profilo in questo momento. Riprova tra qualche istante.
        </p>
      </div>
    );
  }

  const { profile, businessProfile } = data;
  const [stats, reviews, history] = await Promise.all([
    getBusinessOverviewStats(),
    getBusinessReviews(5),
    getBusinessCollaborationHistory(5),
  ]);

  const isVerified = businessProfile.verification_status === 'verified';
  const verificationBadgeColor = isVerified
    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    : businessProfile.verification_status === 'pending'
      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  const verificationLabel = isVerified
    ? '✓ Verificato'
    : businessProfile.verification_status === 'pending'
      ? '⏳ In verifica'
      : 'Non verificato';

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <h1 className="text-2xl font-bold text-zinc-950 md:text-3xl dark:text-zinc-50">Profilo</h1>

      {/* Identity */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {businessProfile.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element -- remote logo, next/image remotePatterns not configured
            <img
              src={businessProfile.logo_url}
              alt={businessProfile.company_name}
              className="h-20 w-20 shrink-0 rounded-lg object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              {businessProfile.company_name}
            </h2>
            <div className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${verificationBadgeColor}`}>
              {verificationLabel}
            </div>
            {businessProfile.city && (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                📍 {businessProfile.city}
                {businessProfile.country ? `, ${businessProfile.country}` : ''}
              </p>
            )}
            {businessProfile.industry && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {businessProfile.industry}
              </p>
            )}
          </div>
        </div>

        {businessProfile.description && (
          <p className="mt-4 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
            {businessProfile.description}
          </p>
        )}

        {(businessProfile.website_url || businessProfile.instagram_handle) && (
          <div className="mt-4 flex flex-wrap gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
            {businessProfile.website_url && (
              <a
                href={businessProfile.website_url}
                target="_blank"
                rel="noreferrer"
                className="break-all text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                🌐 {businessProfile.website_url}
              </a>
            )}
            {businessProfile.instagram_handle && (
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                📷 {businessProfile.instagram_handle}
              </span>
            )}
          </div>
        )}

        <p className="mt-4 border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-500">
          {profile.email}
        </p>
      </div>

      {/* Real counters */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
            {stats.publishedExperiences}
          </div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Experiences pubblicate
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
            {stats.completedCollaborations}
          </div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Collaborazioni completate
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
            {stats.uniqueCreators}
          </div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Creator coinvolti</div>
        </div>
      </div>

      {/* Reviews received */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Valutazioni ricevute
        </h3>
        {reviews.count === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Non hai ancora ricevuto valutazioni dai Creator.
          </p>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-4">
              <div>
                <p className="text-4xl font-bold text-zinc-950 dark:text-zinc-50">
                  {reviews.average}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">su 5</p>
              </div>
              <div>
                <div className="text-2xl">{'⭐'.repeat(Math.round(reviews.average))}</div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {reviews.count} {reviews.count === 1 ? 'valutazione' : 'valutazioni'}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              {reviews.items.map((review) => (
                <div key={review.id}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{'⭐'.repeat(review.rating)}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-500">
                      {new Date(review.created_at).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Recent collaborations */}
      {history.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Ultime collaborazioni
          </h3>
          <div className="mt-4 space-y-2">
            {history.map((item) => (
              <Link
                key={item.id}
                href={`/business/collaborations/${item.id}`}
                className="block rounded-md border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <p className="break-words font-medium text-zinc-900 dark:text-zinc-100">
                  {item.experienceTitle ?? 'Collaborazione'}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {item.creatorName ? `${item.creatorName} · ` : ''}
                  {STATUS_LABELS[item.status] ?? item.status} ·{' '}
                  {new Date(item.created_at).toLocaleDateString('it-IT')}
                </p>
              </Link>
            ))}
          </div>
          <Link
            href="/business/collaborations"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Vedi tutte →
          </Link>
        </div>
      )}

      <form action={logout}>
        <button
          type="submit"
          className="w-full rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Esci
        </button>
      </form>
    </div>
  );
}
