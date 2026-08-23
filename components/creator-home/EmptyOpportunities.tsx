// =============================================================================
// VAYTU — EmptyOpportunities
// =============================================================================
// Shown whenever there are no opportunities to display — on a real
// Production deploy where no Experiences exist yet (Experiences aren't a
// real feature yet), or when the active filter simply matches nothing.
// Editorial/lifestyle tone, not a bare "no data" SaaS message.
// =============================================================================

export function EmptyOpportunities({
  message = 'Nessuna opportunità al momento.',
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-200 px-6 py-12 text-center dark:border-zinc-800">
      <svg
        viewBox="0 0 24 24"
        className="h-8 w-8 text-zinc-300 dark:text-zinc-700"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5 12 12l8-4.5M12 12v9" />
      </svg>
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{message}</p>
      <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
        Torna presto: nuove experience selezionate per te arriveranno a breve.
      </p>
    </div>
  );
}
