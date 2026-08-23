'use client';

// =============================================================================
// VAYTU — Debounced autosave hook
// =============================================================================
// Watches a plain object of form values and, 800ms after the last change,
// calls the given Server Action with them (fire-and-forget from the user's
// point of view — the returned status just drives a small "Salvato"
// indicator). Used by every onboarding step form so progress persists
// field-by-field, not only when the user clicks "Avanti".
// =============================================================================
import { useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutosave<T extends Record<string, unknown>>(
  values: T,
  action: (values: T) => Promise<{ error?: string } | void>,
  delayMs = 800
) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRun = useRef(true);
  const serialized = JSON.stringify(values);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setStatus('saving');
    timer.current = setTimeout(() => {
      action(values)
        .then((result) => setStatus(result?.error ? 'error' : 'saved'))
        .catch(() => setStatus('error'));
    }, delayMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);

  return status;
}

export function AutosaveIndicator({ status }: { status: AutosaveStatus }) {
  const label =
    status === 'saving' ? 'Salvataggio…' : status === 'saved' ? 'Salvato' : status === 'error' ? 'Errore nel salvataggio' : '';
  if (!label) return null;
  return (
    <p
      className={`text-xs ${status === 'error' ? 'text-red-600' : 'text-zinc-400'}`}
      role="status"
    >
      {label}
    </p>
  );
}
