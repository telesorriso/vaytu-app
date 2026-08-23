'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// =============================================================================
// VAYTU — CreatorBottomNav
// =============================================================================
// Fixed mobile bottom navigation — the ONLY primary navigation on mobile (no
// sidebar, no hamburger). Desktop uses CreatorSidebar instead (hidden here
// via md:hidden). "Scopri" is the Home; Candidature/Messaggi/Profilo are
// present as real routes with minimal "in arrivo" placeholder content for
// V1 — no real applications/messaging feature lives behind them yet.
// =============================================================================

const NAV_ITEMS = [
  { href: '/creator', label: 'Scopri' },
  { href: '/creator/candidature', label: 'Candidature' },
  { href: '/creator/messaggi', label: 'Messaggi' },
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
  '/creator/messaggi': (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 5.5h16v11H8l-4 3.5v-3.5H4v-11Z"
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
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
              isActive ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-600'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
              {ICONS[item.href]}
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
