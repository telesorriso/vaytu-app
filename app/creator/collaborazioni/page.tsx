import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/dal';
import { getCreatorCollaborations } from '@/lib/collaborations/data';

export default async function CollaborazioniPage() {
  await requireRole('creator');

  const collaborations = await getCreatorCollaborations();

  const activeCollab = collaborations.filter((c) => c.status === 'active');
  const completedCollab = collaborations.filter((c) => c.status === 'completed');
  const otherCollab = collaborations.filter(
    (c) => c.status !== 'active' && c.status !== 'completed'
  );

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-6 py-8 dark:bg-black">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50">
            Le mie collaborazioni
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Segui il progresso delle tue collaborazioni con i Business.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {activeCollab.length}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Attive</div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {completedCollab.length}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              Completate
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">
              {otherCollab.length}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Altro</div>
          </div>
        </div>

        {/* Active collaborations */}
        {activeCollab.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              Attive ({activeCollab.length})
            </h2>
            <div className="space-y-3">
              {activeCollab.map((c) => (
                <Link
                  key={c.id}
                  href={`/creator/collaborazioni/${c.id}`}
                  className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:hover:border-blue-800 dark:hover:bg-blue-900 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                      {c.experienceTitle || 'Experience'}
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      con {c.businessName || 'Business'}
                    </p>
                  </div>
                  <div className="text-right text-sm text-blue-700 dark:text-blue-300">
                    <div>
                      {new Date(c.created_at).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Completed collaborations */}
        {completedCollab.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              Completate ({completedCollab.length})
            </h2>
            <div className="space-y-3">
              {completedCollab.map((c) => (
                <Link
                  key={c.id}
                  href={`/creator/collaborazioni/${c.id}`}
                  className="flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50 p-4 hover:border-green-300 hover:bg-green-100 dark:border-green-900 dark:bg-green-950 dark:hover:border-green-800 dark:hover:bg-green-900 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 dark:text-green-100">
                      {c.experienceTitle || 'Experience'}
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      con {c.businessName || 'Business'}
                    </p>
                  </div>
                  <div className="text-right text-sm text-green-700 dark:text-green-300">
                    <div>
                      {new Date(c.created_at).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Other collaborations */}
        {otherCollab.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              Altro ({otherCollab.length})
            </h2>
            <div className="space-y-3">
              {otherCollab.map((c) => (
                <Link
                  key={c.id}
                  href={`/creator/collaborazioni/${c.id}`}
                  className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {c.experienceTitle || 'Experience'}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      con {c.businessName || 'Business'} • {c.status}
                    </p>
                  </div>
                  <div className="text-right text-sm text-zinc-600 dark:text-zinc-400">
                    <div>
                      {new Date(c.created_at).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {collaborations.length === 0 && (
          <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-zinc-600 dark:text-zinc-400">
              Non hai ancora collaborazioni. Quando un Business accetterà la tua candidatura,
              apparirà qui.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
