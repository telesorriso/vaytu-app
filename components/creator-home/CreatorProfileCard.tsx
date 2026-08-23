import { VaytuLevelBadge } from './VaytuLevelBadge';

// =============================================================================
// VAYTU — CreatorProfileCard
// =============================================================================
// Compact identity summary: avatar, name, @username, city, Verified, Vaytu
// Level. Deliberately excludes every metric (follower count, engagement,
// etc.) — those stay out of the Home by design, see PROJECT instructions.
// =============================================================================

export function CreatorProfileCard({
  avatarUrl,
  fullName,
  username,
  city,
  levelName,
}: {
  avatarUrl: string | null;
  fullName: string;
  username: string | null;
  city: string | null;
  levelName: string | null;
}) {
  const initial = fullName.trim().charAt(0).toUpperCase() || '?';

  return (
    <section className="flex items-center gap-4 rounded-2xl border border-zinc-100 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-zinc-900 dark:bg-zinc-950">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-lg font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- no next/image remotePatterns configured for this phase
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <h2 className="truncate text-base font-semibold text-zinc-950 dark:text-zinc-50">
            {fullName}
          </h2>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ background: 'var(--vaytu-green-soft)', color: 'var(--vaytu-green)' }}
          >
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden="true">
              <path
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m3.5 8.5 3 3 6-7"
              />
            </svg>
            Verified
          </span>
        </div>

        <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
          {username ? `@${username}` : null}
          {username && city ? ' · ' : null}
          {city ?? null}
        </p>

        <VaytuLevelBadge levelName={levelName} />
      </div>
    </section>
  );
}
