import Link from 'next/link';
import { requireRole } from '@/lib/auth/dal';
import { getNotifications } from '@/lib/notifications/data';
import NotificationsList from './notifications-list';

export default async function NotificationsPage() {
  await requireRole('business');

  const notifications = await getNotifications(50);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-6 py-8 dark:bg-black">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50">Notifiche</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Rimani aggiornato su candidature, collaborazioni e verifiche
          </p>
        </div>

        <NotificationsList initialNotifications={notifications} />

        <Link href="/business" className="text-sm text-blue-600 dark:text-blue-400">
          ← Torna alla Home
        </Link>
      </div>
    </div>
  );
}
