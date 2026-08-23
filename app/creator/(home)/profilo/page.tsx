import Link from 'next/link';
import { getCreatorOnboardingData } from '@/lib/onboarding/creator';
import { getCreatorLevel } from '@/lib/creator-home/level';
import { getCreatorCollaborationHistory, getCreatorReviewStats, type CollaborationHistoryItem } from '@/lib/creator-home/profile';
import { logout } from '@/app/auth/actions';

// =============================================================================
// VAYTU — Profilo
// =============================================================================
// Comprehensive profile showing: profile info, verification status, level,
// completed collaborations count, reviews, collaboration history, and logout.
// =============================================================================

export default async function ProfiloPage() {
  const data = await getCreatorOnboardingData();
  const { profile, creatorProfile } = data!;
  const level = await getCreatorLevel(creatorProfile.current_level_id);
  const collaborationHistory = await getCreatorCollaborationHistory(5);
  const reviewStats = await getCreatorReviewStats();

  const verificationBadgeColor =
    creatorProfile.verification_status === 'verified'
      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      : creatorProfile.verification_status === 'pending'
        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';

  const verificationLabel =
    creatorProfile.verification_status === 'verified'
      ? '✓ Verificato'
      : creatorProfile.verification_status === 'pending'
        ? '⏳ In verifica'
        : 'Non verificato';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Profilo</h1>
      </div>

      {/* Profile Summary Card */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start gap-4">
          {profile.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="h-20 w-20 rounded-lg object-cover"
            />
          )}
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              {creatorProfile.display_name}
            </h2>
            {creatorProfile.city && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">📍 {creatorProfile.city}</p>
            )}
            {creatorProfile.niches && creatorProfile.niches.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {creatorProfile.niches.map((niche) => (
                  <span
                    key={niche}
                    className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {niche}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status and Level */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">
              Verifica
            </p>
            <div className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-medium ${verificationBadgeColor}`}>
              {verificationLabel}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">
              Livello Vaytu
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {level?.name || 'Non assegnato'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">
              Collaborazioni Completate
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {creatorProfile.completed_collaborations_count}
            </p>
          </div>
        </div>
      </div>

      {/* Reviews Summary */}
      {reviewStats.count > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Valutazioni</h3>
          <div className="mt-4 flex items-center gap-4">
            <div>
              <p className="text-4xl font-bold text-zinc-950 dark:text-zinc-50">
                {reviewStats.average}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">su 5</p>
            </div>
            <div>
              <div className="text-2xl">{'⭐'.repeat(Math.round(reviewStats.average))}</div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {reviewStats.count} {reviewStats.count === 1 ? 'valutazione' : 'valutazioni'}
              </p>
            </div>
          </div>
          {reviewStats.fiveStarCount > 0 && (
            <p className="mt-3 text-xs text-green-700 dark:text-green-300">
              ✓ {reviewStats.fiveStarCount} valutazioni a 5 stelle
            </p>
          )}
        </div>
      )}

      {/* Recent Collaborations */}
      {collaborationHistory.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Ultime Collaborazioni
          </h3>
          <div className="mt-4 space-y-2">
            {collaborationHistory.map((collab: CollaborationHistoryItem) => (
              <Link
                key={collab.id}
                href={`/creator/collaborazioni/${collab.id}`}
                className="block rounded-md border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {collab.experience?.title || 'Collaborazione'}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(collab.created_at).toLocaleDateString('it-IT')}
                </p>
              </Link>
            ))}
          </div>
          <Link
            href="/creator/collaborazioni"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Vedi tutte →
          </Link>
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-zinc-200 px-6 py-10 text-center dark:border-zinc-800">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Modifica profilo e impostazioni — presto disponibile.
        </p>
      </div>

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
