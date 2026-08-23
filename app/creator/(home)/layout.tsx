import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/dal';
import { getCreatorOnboardingData, hasSubmittedApplication } from '@/lib/onboarding/creator';
import { CreatorHeader } from '@/components/creator-home/CreatorHeader';
import { CreatorBottomNav } from '@/components/creator-home/CreatorBottomNav';
import { CreatorSidebar } from '@/components/creator-home/CreatorSidebar';

// =============================================================================
// VAYTU — Creator Home chrome (Scopri / Candidature / Messaggi / Profilo)
// =============================================================================
// A route group ((home)) so this layout applies ONLY to /creator,
// /creator/candidature, /creator/messaggi and /creator/profilo — NOT to
// /creator/onboarding/**, which is a sibling directory outside this group
// and keeps its own separate stepper UI untouched.
//
// Same authoritative, server-side guard as before the Creator Home existed
// (requireRole + resume/verification checks) — moved here from the old
// /app/creator/page.tsx body verbatim so it now covers the whole group:
// only a Creator who has submitted AND been verified reaches any of these
// pages; anyone else is bounced to the right onboarding step, exactly as
// before. This is the regression-safety guarantee for this phase.
// =============================================================================

export default async function CreatorHomeLayout({ children }: { children: ReactNode }) {
  await requireRole('creator');

  const data = await getCreatorOnboardingData();
  if (!data || !hasSubmittedApplication(data)) {
    redirect('/creator/onboarding');
  }
  if (data.latestVerification!.status !== 'verified') {
    redirect('/creator/onboarding/status');
  }

  return (
    <div className="flex min-h-screen w-full bg-zinc-50 dark:bg-black">
      <CreatorSidebar />
      {/* min-w-0: without it, a flex item defaults to min-width:auto and refuses
          to shrink below its content's intrinsic width — which defeats the
          horizontally-scrolling OpportunityFilters row further down (its
          natural, unwrapped width would otherwise blow out this whole column,
          and with it the page, past the viewport on mobile). */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <CreatorHeader avatarUrl={data.profile.avatar_url} fullName={data.profile.full_name} />
        <main className="min-w-0 flex-1 pb-24 md:pb-10">
          <div className="mx-auto w-full max-w-5xl px-4 py-3.5 md:py-6">{children}</div>
        </main>
      </div>
      <CreatorBottomNav />
    </div>
  );
}
