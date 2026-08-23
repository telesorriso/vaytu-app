'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { completeCollaboration } from './actions';

// =============================================================================
// VAYTU — Complete collaboration control
// =============================================================================
// The one place a collaboration can move to `completed` from the product.
// Completion is what fires fn_on_collaboration_completed (increments the
// Creator's counter) and unlocks reviews for both sides, so it asks for an
// explicit confirmation rather than acting on a single click.
//
// When the deliverables are not all approved the control renders as a disabled
// explanation instead of a button: the server action re-checks the same gate,
// so this is guidance, not the enforcement.
// =============================================================================

interface CompleteButtonProps {
  collaborationId: string;
  canComplete: boolean;
  reason?: string;
}

export function CompleteButton({ collaborationId, canComplete, reason }: CompleteButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!canComplete) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Completa la collaborazione
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {reason === 'Nessun deliverable definito'
            ? 'Aggiungi almeno un deliverable e approvane i contenuti per poter completare.'
            : reason === 'Non tutti i deliverable sono approvati'
              ? 'Approva tutti i deliverable per poter completare la collaborazione.'
              : (reason ?? 'Questa collaborazione non può ancora essere completata.')}
        </p>
      </div>
    );
  }

  const onComplete = async () => {
    setSubmitting(true);
    setError('');
    try {
      const result = await completeCollaboration(collaborationId);
      if (result.error) {
        setError(result.error);
        setConfirming(false);
      } else {
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
      <p className="text-sm font-semibold text-green-900 dark:text-green-100">
        Tutti i deliverable sono approvati
      </p>
      <p className="mt-1 text-sm text-green-700 dark:text-green-300">
        Segnando la collaborazione come completata, entrambe le parti potranno lasciare una
        valutazione. L&apos;operazione non è reversibile.
      </p>

      {error && (
        <div className="mt-3 rounded bg-red-100 p-2 text-xs text-red-700 dark:bg-red-900 dark:text-red-300">
          {error}
        </div>
      )}

      {confirming ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={onComplete}
            disabled={submitting}
            className="min-h-11 flex-1 rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-600"
          >
            {submitting ? 'Completamento...' : 'Confermo, completa'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={submitting}
            className="min-h-11 flex-1 rounded border border-green-300 px-4 py-2 text-sm font-semibold text-green-900 hover:bg-green-100 disabled:opacity-50 dark:border-green-700 dark:text-green-100 dark:hover:bg-green-900"
          >
            Annulla
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="mt-3 min-h-11 w-full rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
        >
          Segna come completata
        </button>
      )}
    </div>
  );
}
