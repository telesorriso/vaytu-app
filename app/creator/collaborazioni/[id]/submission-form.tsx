'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CollaborationDeliverableRow } from '@/lib/db/types';
import { handleSubmitContent } from './submit-content-actions';

interface SubmissionFormProps {
  collaborationId: string;
  deliverable: CollaborationDeliverableRow;
  onSuccess?: () => void;
}

const platformOptions = [
  'instagram',
  'tiktok',
  'youtube',
  'facebook',
  'x',
  'linkedin',
  'other',
];

export default function SubmissionForm({
  collaborationId,
  deliverable,
  onSuccess,
}: SubmissionFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [contentUrl, setContentUrl] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!contentUrl.trim()) {
      setError('Inserisci l\'URL del contenuto');
      return;
    }

    if (!platform) {
      setError('Seleziona una piattaforma');
      return;
    }

    setSubmitting(true);

    try {
      const result = await handleSubmitContent(
        deliverable.id,
        collaborationId,
        contentUrl.trim(),
        platform,
        caption.trim() || undefined
      );

      if (!result) {
        setError('Errore nell\'invio del contenuto');
        setSubmitting(false);
        return;
      }

      setContentUrl('');
      setPlatform('instagram');
      setCaption('');
      setIsOpen(false);
      router.refresh();

      if (onSuccess) {
        onSuccess();
      }
    } catch (_err) {
      setError('Errore sconosciuto');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        + Invia contenuto
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
        Invia contenuto per {deliverable.deliverable_type.replace(/_/g, ' ')}
      </h4>

      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        {error && (
          <div className="rounded bg-red-100 p-2 text-xs text-red-700 dark:bg-red-900 dark:text-red-300">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-blue-900 dark:text-blue-100">
            URL del contenuto
          </label>
          <input
            type="url"
            value={contentUrl}
            onChange={(e) => setContentUrl(e.target.value)}
            placeholder="https://instagram.com/p/..."
            className="mt-1 min-h-11 w-full rounded border border-blue-300 bg-white px-2 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-blue-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-blue-900 dark:text-blue-100">
            Piattaforma
          </label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="mt-1 min-h-11 w-full rounded border border-blue-300 bg-white px-2 py-2 text-sm text-zinc-900 dark:border-blue-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {platformOptions.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-blue-900 dark:text-blue-100">
            Didascalia (opzionale)
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Aggiungi una descrizione..."
            maxLength={500}
            className="mt-1 min-h-11 w-full rounded border border-blue-300 bg-white px-2 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-blue-700 dark:bg-zinc-800 dark:text-zinc-100"
            rows={2}
          />
          <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
            {caption.length}/500
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 flex-1 rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            {submitting ? 'Invio...' : 'Invia'}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="min-h-11 flex-1 rounded border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-100 dark:hover:bg-blue-900"
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
