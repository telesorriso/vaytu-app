'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// =============================================================================
// VAYTU — BusinessNav
// =============================================================================
// Primary Business navigation. Before this, every Business route was only
// reachable by typing its URL or via ad-hoc inline links, so Candidature and
// Collaborazioni were effectively hidden (FASE 9). Desktop renders a sidebar;
// mobile renders a fixed bottom bar, mirroring the Creator shell so both
// roles behave the same way.
//
// Every entry points at a route that really exists and really works — no
// placeholder destinations.
// =============================================================================

const NAV_ITEMS = [
  { href: '/business/dashboard', label: 'Dashboard' },
  { href: '/business/experiences', label: 'Experiences' },
  { href: '/business/applications', label: 'Candidature' },
  { href: '/business/collaborations', label: 'Collaborazioni' },
  { href: '/business/profilo', label: 'Profilo' },
] as const;

const ICONS: Record<string, React.ReactNode> = {
  '/business/dashboard': (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z"
    />
  ),
  '/business/experiences': (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 6.5h16v13H4v-13Zm0 0L12 3l8 3.5M9 19.5v-6h6v6"
    />
  ),
  '/business/applications': (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 3.5h9L19 8v12.5H6v-17ZM9 12h6M9 15.5h6M14.5 3.5V8H19"
    />
  ),
  '/business/collaborations': (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c.9-2.9 3.1-4.4 6-4.4S13.1 17.1 14 20m2-4.3c2.4.3 4.2 1.8 5 4.3"
    />
  ),
  '/business/profilo': (
    <>
      <circle cx="12" cy="8.5" r="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 20c1.2-3.5 4-5.2 7-5.2s5.8 1.7 7 5.2" />
    </>
  ),
};

function isItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BusinessSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-zinc-100 px-4 py-6 md:flex dark:border-zinc-900">
      <span className="px-2 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        VAYTU
      </span>
      <nav className="mt-8 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                active
                  ? 'bg-zinc-100 text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900/60'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function BusinessBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-zinc-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden dark:border-zinc-900 dark:bg-black/95">
      {NAV_ITEMS.map((item) => {
        const active = isItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-medium ${
              active ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-600'
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
