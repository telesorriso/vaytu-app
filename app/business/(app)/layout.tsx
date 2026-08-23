import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/dal';
import { getBusinessOnboardingData, hasSubmittedApplication } from '@/lib/onboarding/business';
import { getUnreadNotificationCount } from '@/lib/notifications/data';
import { BusinessSidebar, BusinessBottomNav } from '@/components/business/BusinessNav';

// =============================================================================
// VAYTU — Business app chrome
// =============================================================================
// A route group ((app)) so this layout covers Dashboard / Experiences /
// Candidature / Collaborazioni / Profilo / Notifiche but NOT
// /business/onboarding/**, which is a sibling directory outside the group and
// keeps its own stepper UI.
//
// The guard (requireRole + submitted + verified) previously lived duplicated
// in each Business page body. Hoisting it here means every current and future
// route in the group is covered by construction — the individual pages keep
// their own copies too, which is redundant but harmless and keeps each page
// safe if it is ever moved out of this group.
// =============================================================================

export default async function BusinessAppLayout({ children }: { children: ReactNode }) {
  await requireRole('business');

  const data = await getBusinessOnboardingData();
  if (!data || !hasSubmittedApplication(data)) {
    redirect('/business/onboarding');
  }
  if (data.latestVerification!.status !== 'verified') {
    redirect('/business/onboarding/status');
  }

  const unreadCount = await getUnreadNotificationCount();

  return (
    <div className="flex min-h-screen w-full bg-zinc-50 dark:bg-black">
      <BusinessSidebar />
      {/* min-w-0 so wide children (tables, long titles) shrink instead of
          forcing the whole page to scroll horizontally on mobile. */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-100 bg-white/90 px-4 py-2.5 backdrop-blur-sm dark:border-zinc-900 dark:bg-black/90">
          <span className="text-base font-semibold tracking-tight text-zinc-950 md:hidden dark:text-zinc-50">
            VAYTU
          </span>
          <span className="hidden truncate text-sm font-medium text-zinc-600 md:block dark:text-zinc-400">
            {data.businessProfile.company_name}
          </span>

          <Link
            href="/business/notifiche"
            aria-label={
              unreadCount > 0 ? `Notifiche (${unreadCount} non lette)` : 'Notifiche'
            }
            className="relative flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[18px] w-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8Z"
              />
              <path strokeLinecap="round" d="M10 18a2 2 0 0 0 4 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        </header>

        <main className="min-w-0 flex-1 pb-24 md:pb-10">{children}</main>
      </div>
      <BusinessBottomNav />
    </div>
  );
}
