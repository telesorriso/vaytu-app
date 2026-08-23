import { getCreatorOnboardingData } from '@/lib/onboarding/creator';
import { getCreatorLevel } from '@/lib/creator-home/level';
import { CreatorProfileCard } from '@/components/creator-home/CreatorProfileCard';
import { OpportunitiesSection } from '@/components/creator-home/OpportunitiesSection';
import { DEMO_EXPERIENCES, isDemoDataEnabled } from '@/lib/demo/experiences';

// =============================================================================
// VAYTU — Creator Home ("Scopri")
// =============================================================================
// NOT a dashboard: no follower/engagement/analytics metrics here by design
// (those stay in verification/matching/Admin, see PROJECT instructions).
// Answers one question — "cosa posso fare con VAYTU oggi?" — with exactly
// three things, in order: essential profile, Vaytu Level, nearby/compatible
// opportunities. The auth + onboarding-completion guard lives in this
// route group's layout.tsx, not here — every page under (home) is already
// guaranteed to be a verified Creator by the time this renders.
// =============================================================================

export default async function CreatorHomePage() {
  // requireRole('creator') already ran in layout.tsx; getCreatorOnboardingData
  // is wrapped in React's cache(), so this reuses the same request-scoped
  // result instead of hitting Supabase again.
  const data = await getCreatorOnboardingData();
  const { profile, creatorProfile } = data!;
  const level = await getCreatorLevel(creatorProfile.current_level_id);

  const firstName = profile.full_name.trim().split(/\s+/)[0] || profile.full_name;

  return (
    <div className="space-y-3.5 md:space-y-5">
      <div className="space-y-0.5">
        <h1 className="text-xl font-semibold text-zinc-950 md:text-2xl dark:text-zinc-50">
          Ciao, {firstName} 👋
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Scopri le migliori experiences selezionate per te.
        </p>
      </div>

      <CreatorProfileCard
        avatarUrl={profile.avatar_url}
        fullName={profile.full_name}
        username={creatorProfile.username}
        city={creatorProfile.city}
        levelName={level?.name ?? null}
      />

      <OpportunitiesSection experiences={isDemoDataEnabled() ? DEMO_EXPERIENCES : []} />
    </div>
  );
}
