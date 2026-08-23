import { getCreatorOnboardingData } from '@/lib/onboarding/creator';
import { getCreatorLevel } from '@/lib/creator-home/level';
import { CreatorProfileCard } from '@/components/creator-home/CreatorProfileCard';
import { logout } from '@/app/auth/actions';

// =============================================================================
// VAYTU — Profilo
// =============================================================================
// Essential profile summary + logout. Impostazioni/logout deliberately live
// here rather than on the Home, per the product decision for this phase.
// Full settings (edit profile, notification preferences, etc.) are out of
// scope for this phase — this is only the placeholder home for them, plus
// the one action (logout) that must stay reachable for regression safety.
// =============================================================================

export default async function ProfiloPage() {
  const data = await getCreatorOnboardingData();
  const { profile, creatorProfile } = data!;
  const level = await getCreatorLevel(creatorProfile.current_level_id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Profilo</h1>

      <CreatorProfileCard
        avatarUrl={profile.avatar_url}
        fullName={profile.full_name}
        username={creatorProfile.username}
        city={creatorProfile.city}
        levelName={level?.name ?? null}
      />

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
