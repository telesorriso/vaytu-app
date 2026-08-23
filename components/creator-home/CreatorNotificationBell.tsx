'use client';

import Link from 'next/link';

export default function CreatorNotificationBell({ unreadCount = 0 }: { unreadCount?: number }) {
  return (
    <Link
      href="/creator/notifiche"
      aria-label={`Notifiche ${unreadCount > 0 ? `(${unreadCount} non lette)` : ''}`}
      className="relative flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      title={`Notifiche ${unreadCount > 0 ? `(${unreadCount} non lette)` : ''}`}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6">
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
  );
}
