'use client';

import { useEffect } from 'react';

// =============================================================================
// VAYTU — Global error boundary (FASE 11)
// =============================================================================
// Without this, an uncaught render/data error shows the Next.js default error
// screen — English, and in dev it prints the raw stack. This renders a plain
// Italian message and a retry, and never displays error.message: a thrown
// Postgres error would otherwise leak SQLSTATE codes and policy names into
// the page. The full error still reaches the console for debugging.
// =============================================================================

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-12 text-center dark:bg-black">
      <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
        Qualcosa è andato storto
      </h1>
      <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        Non siamo riusciti a caricare questa pagina. Riprova tra qualche istante: se il problema
        persiste, riprova più tardi.
      </p>
      {error.digest && (
        <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-600">
          Codice errore: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        Riprova
      </button>
    </div>
  );
}
