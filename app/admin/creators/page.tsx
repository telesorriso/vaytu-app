import Link from 'next/link';
import { requireRole } from '@/lib/auth/dal';
import { listPendingCreators } from '@/lib/admin/data';

export default async function PendingCreatorsList() {
  await requireRole('admin');
  const pending = await listPendingCreators();

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Link href="/admin" className="text-sm text-zinc-500 hover:underline">
        ← Admin
      </Link>
      <h1 className="mb-6 mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
        Creator in attesa ({pending.length})
      </h1>

      {pending.length === 0 ? (
        <p className="text-sm text-zinc-500">Nessuna candidatura in attesa.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {pending.map(({ verification, creatorProfile, profile }) => (
            <li key={verification.id}>
              <Link
                href={`/admin/creators/${creatorProfile.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <span>
                  <span className="font-medium">{profile.full_name}</span>
                  <span className="ml-2 text-zinc-500">@{creatorProfile.username}</span>
                </span>
                <span className="text-xs text-zinc-400">
                  {new Date(verification.submitted_at).toLocaleDateString('it-IT')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
