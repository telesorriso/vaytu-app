'use client';

import { useState } from 'react';
import { updateApplicationStatus } from './actions';

interface ActionButtonsProps {
  applicationId: string;
}

export function ActionButtons({ applicationId }: ActionButtonsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await updateApplicationStatus(applicationId, 'accepted');
      if (result.success) {
        window.location.reload();
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await updateApplicationStatus(applicationId, 'rejected');
      if (result.success) {
        window.location.reload();
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-md bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 dark:bg-green-500 dark:hover:bg-green-600"
        >
          ✓ Accetta
        </button>
        <button
          onClick={handleReject}
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-md bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
        >
          ✗ Rifiuta
        </button>
      </div>
      {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
    </div>
  );
}
