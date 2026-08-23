'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// =============================================================================
// VAYTU — CreatorSidebar
// =============================================================================
// Discreet desktop-only navigation (hidden on mobile — CreatorBottomNav
// covers that). Same 4 destinations as the mobile nav, kept intentionally
// simple rather than adding a distinct "Impostazioni" entry: settings live
// inside Profilo (see /app/creator/(home)/profilo), so a separate nav item
// pointing at the same page would just be a duplicate link.
// =============================================================================

const NAV_ITEMS = [
  { href: '/creator', label: 'Scopri' },
  { href: '/creator/candidature', label: 'Candidature' },
  { href: '/creator/collaborazioni', label: 'Collaborazioni' },
  { href: '/creator/profilo', label: 'Profilo' },
] as const;

export function CreatorSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col justify-between border-r border-zinc-100 px-4 py-6 md:flex dark:border-zinc-900">
      <div className="space-y-8">
        <span className="px-2 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          VAYTU
        </span>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/creator' ? pathname === '/creator' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-zinc-100 text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900/60'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
