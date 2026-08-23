// =============================================================================
// VAYTU — Creator loading state (FASE 11)
// =============================================================================
// Every Creator page is server-rendered and hits Supabase, so navigation has a
// real gap. Without a loading.tsx the browser simply stalls on the previous
// page with no feedback. Skeleton blocks, not a spinner, so the layout does
// not jump when the content lands.
// =============================================================================

export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Caricamento in corso">
      <div className="h-7 w-48 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-64 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-56 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
          />
        ))}
      </div>
    </div>
  );
}
