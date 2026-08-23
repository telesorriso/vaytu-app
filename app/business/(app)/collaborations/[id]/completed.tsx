'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CollaborationRow, ReviewRow } from '@/lib/db/types';
import { submitBusinessReview } from './actions';

interface CompletedCollaborationViewProps {
  collaboration: CollaborationRow & {
    experience?: {
      title: string;
      description: string;
    };
    creator?: {
      display_name: string;
      avatar_url: string | null;
      city?: string;
    };
  };
  deliverables: Array<{ id: string; deliverable_type: string; due_date: string | null }>;
  submissions: Array<{
    id: string;
    content_url: string;
    platform: string;
    status: string;
    submitted_at: string;
  }>;
  givenReview: ReviewRow | null;
  receivedReview: ReviewRow | null;
}

export default function CompletedCollaborationView({
  collaboration,
  deliverables,
  submissions,
  givenReview,
  receivedReview,
}: CompletedCollaborationViewProps) {
  const router = useRouter();
  const [showReviewForm, setShowReviewForm] = useState(!givenReview);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmitReview = async () => {
    if (!rating) {
      setError('Seleziona una valutazione');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await submitBusinessReview(collaboration.id, rating, comment);
      if (!result) {
        setError('Errore nell\'invio della review');
      } else {
        setShowReviewForm(false);
        router.refresh();
      }
    } catch (_err) {
      setError('Errore sconosciuto');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-6 py-8 dark:bg-black">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        {/* Status Banner */}
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
          <p className="text-sm font-semibold text-green-900 dark:text-green-100">
            ✓ Collaborazione completata
          </p>
          <p className="mt-1 text-xs text-green-700 dark:text-green-300">
            Completata il {new Date(collaboration.created_at).toLocaleDateString('it-IT')}
          </p>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50">
            {collaboration.experience?.title}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Creator: {collaboration.creator?.display_name}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Deliverables */}
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                Deliverable ({deliverables.length})
              </h2>
              <div className="mt-3 space-y-2">
                {deliverables.map((d) => (
                  <div key={d.id} className="flex justify-between rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {d.deliverable_type.replace(/_/g, ' ')}
                      </p>
                      {d.due_date && (
                        <p className="text-xs text-zinc-500">Scadenza: {new Date(d.due_date).toLocaleDateString('it-IT')}</p>
                      )}
                    </div>
                    <div className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      Approvato
                    </div>
                  </div>
                ))}
              </div>
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
                        <div className="px-2 py-1 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          Approvato
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Received Review */}
            {receivedReview && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950">
                <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  Valutazione ricevuta dal Creator
                </h2>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">
                      {'⭐'.repeat(receivedReview.rating)}
                    </div>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {receivedReview.rating}/5
                    </span>
                  </div>
                  {receivedReview.comment && (
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {receivedReview.comment}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Review Form */}
            {showReviewForm && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950">
                <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                  Lascia una valutazione al Creator
                </h2>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  Condividi il tuo feedback sulla collaborazione con {collaboration.creator?.display_name}
                </p>

                {error && (
                  <div className="mt-3 rounded bg-red-100 p-2 text-xs text-red-700 dark:bg-red-900 dark:text-red-300">
                    {error}
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      Valutazione
                    </label>
                    <div className="mt-2 flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className={`text-3xl transition ${
                            star <= rating ? 'text-yellow-400' : 'text-zinc-300 dark:text-zinc-600'
                          }`}
                        >
                          ⭐
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      Commento (opzionale)
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Condividi il tuo feedback..."
                      maxLength={500}
                      className="mt-2 w-full rounded border border-amber-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-amber-700 dark:bg-zinc-800 dark:text-zinc-100"
                      rows={3}
                    />
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                      {comment.length}/500
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSubmitReview}
                      disabled={submitting}
                      className="flex-1 rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-700 dark:hover:bg-amber-600"
                    >
                      {submitting ? 'Invio...' : 'Invia valutazione'}
                    </button>
                    <button
                      onClick={() => setShowReviewForm(false)}
                      className="flex-1 rounded border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900"
                    >
                      Chiudi
                    </button>
                  </div>
                </div>
              </div>
            )}

            {givenReview && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950">
                <h2 className="text-lg font-semibold text-green-900 dark:text-green-100">
                  La tua valutazione
                </h2>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">
                      {'⭐'.repeat(givenReview.rating)}
                    </div>
                    <span className="text-sm text-green-700 dark:text-green-300">
                      {givenReview.rating}/5
                    </span>
                  </div>
                  {givenReview.comment && (
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {givenReview.comment}
                    </p>
                  )}
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Inviata il {new Date(givenReview.created_at).toLocaleDateString('it-IT')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Creator Card */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 text-lg font-semibold text-zinc-950 dark:text-zinc-50">Creator</h3>
            {collaboration.creator?.avatar_url && (
              <img
                src={collaboration.creator.avatar_url}
                alt={collaboration.creator.display_name}
                className="mb-3 h-16 w-16 rounded-lg object-cover"
              />
            )}
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              {collaboration.creator?.display_name}
            </p>
            {collaboration.creator?.city && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                📍 {collaboration.creator.city}
              </p>
            )}
          </div>
        </div>

        {/* Back */}
        <Link href="/business/collaborations" className="text-sm text-blue-600 dark:text-blue-400">
          ← Torna alle collaborazioni
        </Link>
      </div>
    </div>
  );
}
