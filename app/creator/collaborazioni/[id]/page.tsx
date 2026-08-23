import Link from 'next/link';
import { requireRole } from '@/lib/auth/dal';
import { getAuthUser } from '@/lib/auth/dal';
import {
  getCollaborationDetail,
  getCollaborationDeliverables,
  getCollaborationSubmissions,
  getCollaborationNextAction,
} from '@/lib/collaborations/data';
import { getReceivedReviews, getGivenReviews } from '@/lib/reviews/data';
import CompletedCollaborationView from './completed';
import SubmissionForm from './submission-form';

interface CollaborationDetailPageProps {
  params: { id: string };
}

export default async function CollaborationDetailPage({
  params,
}: CollaborationDetailPageProps) {
  await requireRole('creator');
  const user = await getAuthUser();

  const collaboration = await getCollaborationDetail(params.id);
  if (!collaboration) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Collaborazione non trovata
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Torna alle{' '}
            <Link
              href="/creator/collaborazioni"
              className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              mie collaborazioni
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // If collaboration is completed, show completed view
  if (collaboration.status === 'completed' && user) {
    const deliverables = await getCollaborationDeliverables(params.id);
    const submissions = await getCollaborationSubmissions(params.id);
    const receivedReviews = await getReceivedReviews();
    const givenReviews = await getGivenReviews();

    const receivedReview = receivedReviews.find(
      (r) => r.collaboration_id === params.id && r.review_type === 'business_to_creator'
    ) || null;
    const givenReview = givenReviews.find(
      (r) => r.collaboration_id === params.id && r.review_type === 'creator_to_business'
    ) || null;

    return (
      <CompletedCollaborationView
        collaboration={collaboration}
        deliverables={deliverables}
        submissions={submissions}
        givenReview={givenReview}
        receivedReview={receivedReview}
      />
    );
  }

  const deliverables = await getCollaborationDeliverables(params.id);
  const submissions = await getCollaborationSubmissions(params.id);
  const nextAction = await getCollaborationNextAction(params.id, 'creator');

  const hasDeliverables = deliverables.length > 0;
  const allApproved = hasDeliverables &&
    deliverables.every((d) => d.status === 'approved');

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-6 py-8 dark:bg-black">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        {/* Back link */}
        <Link
          href="/creator/collaborazioni"
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          ← Torna alle collaborazioni
        </Link>

        {/* Header */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50">
                {collaboration.experience?.title || 'Experience'}
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                con {collaboration.business?.company_name || 'Business'}
              </p>
            </div>
            <div className="text-right">
              <div
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  collaboration.status === 'active'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : collaboration.status === 'completed'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                {collaboration.status === 'active'
                  ? 'Attiva'
                  : collaboration.status === 'completed'
                    ? 'Completata'
                    : collaboration.status.charAt(0).toUpperCase() +
                      collaboration.status.slice(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Next action */}
        {nextAction && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              {nextAction.description}
            </p>
            {nextAction.cta && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                → {nextAction.cta}
              </p>
            )}
          </div>
        )}

        {/* Content grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Experience brief */}
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                {hasDeliverables ? 'Brief' : 'Brief in preparazione'}
              </h2>
              {hasDeliverables ? (
                <dl className="space-y-3">
                  {collaboration.experience?.description && (
                    <div>
                      <dt className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        Descrizione
                      </dt>
                      <dd className="text-sm text-zinc-700 dark:text-zinc-300">
                        {collaboration.experience.description}
                      </dd>
                    </div>
                  )}
                  {collaboration.experience?.requirements && (
                    <div>
                      <dt className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        Requisiti
                      </dt>
                      <dd className="text-sm text-zinc-700 dark:text-zinc-300">
                        {collaboration.experience.requirements}
                      </dd>
                    </div>
                  )}
                  {collaboration.experience?.compensation_type && (
                    <div>
                      <dt className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        Compenso
                      </dt>
                      <dd className="text-sm text-zinc-700 dark:text-zinc-300">
                        {collaboration.experience.compensation_type ===
                        'paid'
                          ? `€${collaboration.experience.compensation_value}`
                          : collaboration.experience.compensation_type
                              .split('_')
                              .map(
                                (w: string) =>
                                  w.charAt(0).toUpperCase() + w.slice(1)
                              )
                              .join(' ')}
                      </dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Il Business sta preparando i dettagli della collaborazione. Ricarica per vedere gli
                  aggiornamenti.
                </p>
              )}
            </div>

            {/* Deliverables */}
            {hasDeliverables && (
              <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  Deliverable richiesti
                </h2>
                <div className="space-y-4">
                  {deliverables.map((d) => (
                    <div key={d.id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {d.deliverable_type
                              .split('_')
                              .map(
                                (w) =>
                                  w.charAt(0).toUpperCase() + w.slice(1)
                              )
                              .join(' ')}
                          </p>
                          {d.description && (
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                              {d.description}
                            </p>
                          )}
                          {d.due_date && (
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                              Scadenza:{' '}
                              {new Date(d.due_date).toLocaleDateString('it-IT')}
                            </p>
                          )}
                        </div>
                        <div
                          className={`ml-2 inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            d.status === 'approved'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                              : d.status === 'submitted'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                          }`}
                        >
                          {d.status === 'approved'
                            ? 'Approvato'
                            : d.status === 'submitted'
                              ? 'Inviato'
                              : d.status.charAt(0).toUpperCase() +
                                d.status.slice(1)}
                        </div>
                      </div>
                      {d.status !== 'approved' && (
                        <SubmissionForm collaborationId={params.id} deliverable={d} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submissions */}
            {submissions.length > 0 && (
              <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  I tuoi contenuti ({submissions.length})
                </h2>
                <div className="space-y-3">
                  {submissions.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-md border border-zinc-200 p-3 dark:border-zinc-700"
                    >
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {s.deliverable?.deliverable_type
                          .split('_')
                          .map(
                            (w) => w.charAt(0).toUpperCase() + w.slice(1)
                          )
                          .join(' ') || 'Contenuto'}
                      </p>
                      <p className="mt-1 break-all text-xs text-blue-600 dark:text-blue-400">
                        <a href={s.content_url} target="_blank" rel="noreferrer">
                          {s.content_url}
                        </a>
                      </p>
                      {s.caption && (
                        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                          {s.caption}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-zinc-500 dark:text-zinc-500">
                          {new Date(s.submitted_at).toLocaleDateString(
                            'it-IT'
                          )}
                        </p>
                        <div
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            s.status === 'approved'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                              : s.status === 'rejected'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          }`}
                        >
                          {s.status === 'approved'
                            ? 'Approvato'
                            : s.status === 'rejected'
                              ? 'Rifiutato'
                              : 'In revisione'}
                        </div>
                      </div>
                      {s.review_notes && (
                        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                          Note: {s.review_notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              Profilo Business
            </h3>

            {collaboration.business?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={collaboration.business.logo_url}
                alt={collaboration.business.company_name}
                className="mb-4 h-16 w-16 rounded-lg object-cover"
              />
            )}

            <h4 className="font-semibold text-zinc-950 dark:text-zinc-50">
              {collaboration.business?.company_name || 'Business'}
            </h4>

            {collaboration.business?.city && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                📍 {collaboration.business.city}
              </p>
            )}

            <div className="mt-4 space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">
                Stato
              </p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {collaboration.status === 'active'
                  ? '🟢 Attiva'
                  : collaboration.status === 'completed'
                    ? '✓ Completata'
                    : collaboration.status}
              </p>
            </div>

            {collaboration.end_date && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">
                  Termine
                </p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {new Date(collaboration.end_date).toLocaleDateString(
                    'it-IT'
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
