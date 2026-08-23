'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { NotificationRow } from '@/lib/db/types';
import { handleMarkAsRead, handleMarkAllAsRead, handleDelete } from './actions';

interface NotificationsListProps {
  initialNotifications: NotificationRow[];
}

const notificationTypeLabels: Record<string, string> = {
  application_received: 'Candidatura ricevuta',
  application_accepted: 'Candidatura accettata',
  application_rejected: 'Candidatura rifiutata',
  collaboration_started: 'Collaborazione iniziata',
  collaboration_completed: 'Collaborazione completata',
  deliverable_due: 'Deliverable in scadenza',
  submission_reviewed: 'Contenuto revisionato',
  verification_update: 'Verifica aggiornata',
  review_received: 'Valutazione ricevuta',
  system: 'Notifica di sistema',
};

const notificationTypeColors: Record<string, string> = {
  application_received: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950',
  application_accepted: 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950',
  application_rejected: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950',
  collaboration_started: 'border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950',
  collaboration_completed: 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950',
  deliverable_due: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950',
  submission_reviewed: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950',
  verification_update: 'border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950',
  review_received: 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950',
  system: 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900',
};

export default function NotificationsList({ initialNotifications }: NotificationsListProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const onMarkAsRead = async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n
      )
    );
    await handleMarkAsRead(notificationId);
    router.refresh();
  };

  const onMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    setLoading(true);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    );
    await handleMarkAllAsRead();
    router.refresh();
    setLoading(false);
  };

  const onDelete = async (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    await handleDelete(notificationId);
    router.refresh();
  };

  if (notifications.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-600 dark:text-zinc-400">Nessuna notifica per ora</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {unreadCount} non letta{unreadCount !== 1 ? 's' : ''}
          </div>
          <button
            onClick={onMarkAllAsRead}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 dark:text-blue-400"
          >
            {loading ? 'In elaborazione...' : 'Segna tutte come lette'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`rounded-lg border p-4 transition ${
              notificationTypeColors[notification.type] ||
              'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
            } ${!notification.is_read ? 'ring-2 ring-offset-1 ring-blue-400 dark:ring-offset-black' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-zinc-950 dark:text-zinc-50">
                  {notification.title}
                </h3>
                {notification.body && (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {notification.body}
                  </p>
                )}
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                  {new Date(notification.created_at).toLocaleDateString('it-IT')}{' '}
                  {new Date(notification.created_at).toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="flex gap-2">
                {!notification.is_read && (
                  <button
                    onClick={() => onMarkAsRead(notification.id)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Leggi
                  </button>
                )}
                <button
                  onClick={() => onDelete(notification.id)}
                  className="text-xs font-semibold text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
