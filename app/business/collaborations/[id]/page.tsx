import Link from 'next/link';
import { requireRole } from '@/lib/auth/dal';
import { getAuthUser } from '@/lib/auth/dal';
import { getCollaborationDetail, getCollaborationDeliverables, getCollaborationSubmissions, canCompleteCollaboration, getCollaborationNextAction } from '@/lib/collaborations/data';
import { getReceivedReviews, getGivenReviews } from '@/lib/reviews/data';
import CompletedCollaborationView from './completed';

interface CollaborationPageProps {
  params: { id: string };
}

export default async function BusinessCollaborationPage({ params }: CollaborationPageProps) {
  await requireRole('business');
  const user = await getAuthUser();

  const collaboration = await getCollaborationDetail(params.id);
  if (!collaboration) return <div className="p-8 text-center">Collaborazione non trovata</div>;

  // If collaboration is completed, show completed view
  if (collaboration.status === 'completed' && user) {
    const deliverables = await getCollaborationDeliverables(params.id);
    const submissions = await getCollaborationSubmissions(params.id);
    const receivedReviews = await getReceivedReviews();
    const givenReviews = await getGivenReviews();

    const receivedReview = receivedReviews.find(
      (r) => r.collaboration_id === params.id && r.review_type === 'creator_to_business'
    ) || null;
    const givenReview = givenReviews.find(
      (r) => r.collaboration_id === params.id && r.review_type === 'business_to_creator'
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
  const completion = await canCompleteCollaboration(params.id);
  const nextAction = await getCollaborationNextAction(params.id, 'business');

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-6 py-8 dark:bg-black">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <Link href="/business/collaborations" className="text-sm text-blue-600 dark:text-blue-400">
          ← Torna alle collaborazioni
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50">
            {collaboration.experience?.title}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Creator: {collaboration.creator?.display_name}
          </p>
        </div>

        {nextAction && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              {nextAction.description}
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Deliverables */}
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  Deliverable ({deliverables.length})
                </h2>
              </div>
              {deliverables.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                  Nessun deliverable definito. Aggiungi i contenuti richiesti per questa collaborazione.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {deliverables.map((d) => (
                    <div key={d.id} className="flex justify-between rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {d.deliverable_type.replace(/_/g, ' ')}
                        </p>
                        {d.due_date && <p className="text-xs text-zinc-500">Scadenza: {new Date(d.due_date).toLocaleDateString('it-IT')}</p>}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full font-medium ${d.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                        {d.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submissions */}
            {submissions.length > 0 && (
              <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  Contenuti ricevuti ({submissions.length})
                </h2>
                <div className="mt-3 space-y-2">
                  {submissions.map((s) => (
                    <div key={s.id} className="rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
                      <a href={s.content_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 dark:text-blue-400 break-all">
                        {s.content_url}
                      </a>
                      <div className="mt-1 flex justify-between text-xs">
                        <span className="text-zinc-500">{new Date(s.submitted_at).toLocaleDateString('it-IT')}</span>
                        <div className={`px-2 py-1 rounded-full font-medium ${s.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : s.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'}`}>
                          {s.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Creator card */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 text-lg font-semibold text-zinc-950 dark:text-zinc-50">Creator</h3>
            {collaboration.creator?.avatar_url && (
              <img src={collaboration.creator.avatar_url} alt={collaboration.creator.display_name} className="mb-3 h-16 w-16 rounded-lg object-cover" />
            )}
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{collaboration.creator?.display_name}</p>
            {collaboration.creator?.city && <p className="text-sm text-zinc-600 dark:text-zinc-400">📍 {collaboration.creator.city}</p>}
            {collaboration.creator?.niches && collaboration.creator.niches.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {collaboration.creator.niches.map((n) => (
                  <span key={n} className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {n}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
