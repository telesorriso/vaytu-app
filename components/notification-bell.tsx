'use client';

import Link from 'next/link';

interface NotificationBellProps {
  href: string;
  initialUnreadCount?: number;
}

export default function NotificationBell({ href, initialUnreadCount = 0 }: NotificationBellProps) {
  return (
    <Link
      href={href}
      className="relative inline-flex items-center text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      title="Notifiche"
    >
      <span className="text-xl">🔔</span>
      {initialUnreadCount > 0 && (
        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
          {initialUnreadCount > 99 ? '99+' : initialUnreadCount}
        </span>
      )}
    </Link>
  );
}
