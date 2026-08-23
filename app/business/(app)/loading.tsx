// =============================================================================
// VAYTU — Business loading state (FASE 11)
// =============================================================================
// Same rationale as the Creator loading state: the dashboard and the report
// pages each run several counting queries, so the navigation gap is visible.
// =============================================================================

export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-6 md:py-8"
      aria-busy="true"
      aria-label="Caricamento in corso"
    >
      <div className="h-8 w-56 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
