'use client';

import { useState } from 'react';
import type { ExperienceStatus } from '@/lib/db/types';
import { submitChangeStatus } from '../actions';
import { toUserMessage } from '@/lib/actions/errors';

interface StatusButtonProps {
  experienceId: string;
  currentStatus: ExperienceStatus;
}

const ACTIONS: Record<ExperienceStatus, Array<{ status: ExperienceStatus; label: string; color: string }>> = {
  draft: [
    { status: 'published', label: 'Pubblica', color: 'bg-green-600 hover:bg-green-700' },
    { status: 'archived', label: 'Archivia', color: 'bg-zinc-600 hover:bg-zinc-700' },
  ],
  published: [
    { status: 'paused', label: 'Metti in pausa', color: 'bg-orange-600 hover:bg-orange-700' },
    { status: 'closed', label: 'Chiudi', color: 'bg-red-600 hover:bg-red-700' },
    { status: 'archived', label: 'Archivia', color: 'bg-zinc-600 hover:bg-zinc-700' },
  ],
  paused: [
    { status: 'published', label: 'Ripubblica', color: 'bg-green-600 hover:bg-green-700' },
    { status: 'closed', label: 'Chiudi', color: 'bg-red-600 hover:bg-red-700' },
    { status: 'archived', label: 'Archivia', color: 'bg-zinc-600 hover:bg-zinc-700' },
  ],
  closed: [
    { status: 'published', label: 'Ripubblica', color: 'bg-green-600 hover:bg-green-700' },
    { status: 'archived', label: 'Archivia', color: 'bg-zinc-600 hover:bg-zinc-700' },
  ],
  archived: [],
};

export function StatusButton({ experienceId, currentStatus }: StatusButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStatusChange = async (status: ExperienceStatus) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await submitChangeStatus(experienceId, status, {});
      if (result.success) {
        // Reload page on success
        window.location.reload();
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const availableActions = ACTIONS[currentStatus];

  if (availableActions.length === 0) {
    return <span className="text-xs text-zinc-500">Nessuna azione disponibile</span>;
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        Cambia stato ▼
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {availableActions.map((action) => (
            <button
              key={action.status}
              onClick={() => {
                handleStatusChange(action.status);
                setIsOpen(false);
              }}
              disabled={isLoading}
              className={`block w-full px-4 py-2 text-left text-sm font-medium text-white ${action.color} first:rounded-t-lg last:rounded-b-lg disabled:opacity-50`}
            >
              {action.label}
            </button>
          ))}
          {error && (
            <div className="border-t border-zinc-200 px-4 py-2 text-xs text-red-600 dark:border-zinc-800 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
