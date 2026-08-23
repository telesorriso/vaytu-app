import Link from 'next/link';

// =============================================================================
// VAYTU — CreatorHeader
// =============================================================================
// Wordmark + notifications + avatar. Notifications is a static/decorative
// bell for V1 (no real notification center wired up here — out of scope,
// see PROJECT instructions: "notifiche reali aggiuntive"). Avatar links to
// Profilo, the one place settings/logout live in this phase.
// =============================================================================

export function CreatorHeader({ avatarUrl, fullName }: { avatarUrl: string | null; fullName: string }) {
  const initial = fullName.trim().charAt(0).toUpperCase() || '?';

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-100 bg-white/90 px-4 py-2.5 backdrop-blur-sm dark:border-zinc-900 dark:bg-black/90">
      <span className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        VAYTU
      </span>

      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 dark:text-zinc-500"
          title="Notifiche"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8Z"
            />
            <path strokeLinecap="round" d="M10 18a2 2 0 0 0 4 0" />
          </svg>
        </span>

        <Link
          href="/creator/profilo"
          aria-label="Profilo"
          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- small avatar, no next/image remotePatterns configured for this phase
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </Link>
      </div>
    </header>
  );
}
