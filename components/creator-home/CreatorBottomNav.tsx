'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// =============================================================================
// VAYTU — CreatorBottomNav
// =============================================================================
// Fixed mobile bottom navigation — the ONLY primary navigation on mobile (no
// sidebar, no hamburger). Desktop uses CreatorSidebar instead (hidden here
// via md:hidden). Every entry is a route backed by real data; the old
// "Messaggi" entry was removed in FASE 9 because messaging does not exist —
// a nav item is a promise that the feature works. Notifications are reachable
// from the header bell rather than a fifth tab.
// =============================================================================

const NAV_ITEMS = [
  { href: '/creator', label: 'Scopri' },
  { href: '/creator/candidature', label: 'Candidature' },
  { href: '/creator/collaborazioni', label: 'Collaborazioni' },
  { href: '/creator/profilo', label: 'Profilo' },
] as const;

const ICONS: Record<(typeof NAV_ITEMS)[number]['href'], ReactNode> = {
  '/creator': (
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
  ),
  '/creator/candidature': (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 3.5h9L19 8v12.5H6v-17Z M6 3.5v0M9 12h6M9 15.5h6M14.5 3.5V8H19"
    />
  ),
  '/creator/collaborazioni': (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c.9-2.9 3.1-4.4 6-4.4S13.1 17.1 14 20m2-4.3c2.4.3 4.2 1.8 5 4.3"
    />
  ),
  '/creator/profilo': (
    <>
      <circle cx="12" cy="8.5" r="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 20c1.2-3.5 4-5.2 7-5.2s5.8 1.7 7 5.2" />
    </>
  ),
};

export function CreatorBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-zinc-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden dark:border-zinc-900 dark:bg-black/95">
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === '/creator' ? pathname === '/creator' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-medium ${
              isActive ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-600'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              {ICONS[item.href]}
            </svg>
            <span className="w-full truncate text-center">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
