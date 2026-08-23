import Link from 'next/link';

// =============================================================================
// VAYTU — 404 (FASE 11)
// =============================================================================
// Italian not-found page replacing the English Next.js default. Links back to
// the site root rather than a role dashboard: this renders for signed-out
// visitors too, and "/" already routes each role to the right place.
// =============================================================================

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-12 text-center dark:bg-black">
      <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">Pagina non trovata</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        La pagina che cerchi non esiste o è stata spostata.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        Torna alla Home
      </Link>
    </div>
  );
}
