import Link from 'next/link';
import { requireRole } from '@/lib/auth/dal';
import { listPendingCreators, listPendingBusinesses } from '@/lib/admin/data';
import { logout } from '@/app/auth/actions';

export default async function AdminHome() {
  const profile = await requireRole('admin');
  const [pendingCreators, pendingBusinesses] = await Promise.all([
    listPendingCreators(),
    listPendingBusinesses(),
  ]);

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <h1 className="mb-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
        Admin — {profile.fullName}
      </h1>
      <p className="mb-6 text-sm text-zinc-500">Verifica Creator e Business in attesa.</p>

      <div className="space-y-3">
        <Link
          href="/admin/creators"
          className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <span className="font-medium">Creator in attesa</span>
          <span className="rounded-full bg-zinc-950 px-2 py-0.5 text-xs font-medium text-white dark:bg-zinc-50 dark:text-zinc-950">
            {pendingCreators.length}
          </span>
        </Link>
        <Link
          href="/admin/business"
          className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <span className="font-medium">Business in attesa</span>
          <span className="rounded-full bg-zinc-950 px-2 py-0.5 text-xs font-medium text-white dark:bg-zinc-50 dark:text-zinc-950">
            {pendingBusinesses.length}
          </span>
        </Link>
      </div>

      <form action={logout} className="mt-8">
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Esci
        </button>
      </form>
    </div>
  );
}
