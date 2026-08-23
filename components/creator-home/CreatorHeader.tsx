import Link from 'next/link';
import CreatorNotificationBell from './CreatorNotificationBell';

// =============================================================================
// VAYTU — CreatorHeader
// =============================================================================
// Wordmark + notifications + avatar. Notifications now shows an interactive
// bell with unread count. Avatar links to Profilo, the one place
// settings/logout live in this phase.
// =============================================================================

export function CreatorHeader({
  avatarUrl,
  fullName,
  unreadNotifications = 0
}: {
  avatarUrl: string | null;
  fullName: string;
  unreadNotifications?: number;
}) {
  const initial = fullName.trim().charAt(0).toUpperCase() || '?';

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-100 bg-white/90 px-4 py-2.5 backdrop-blur-sm dark:border-zinc-900 dark:bg-black/90">
      <span className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        VAYTU
      </span>

      <div className="flex items-center gap-2.5">
        <CreatorNotificationBell unreadCount={unreadNotifications} />

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
