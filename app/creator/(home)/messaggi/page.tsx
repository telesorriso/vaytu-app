// =============================================================================
// VAYTU — Messaggi (placeholder)
// =============================================================================
// Real messaging is explicitly out of scope for this phase (see PROJECT
// instructions: "messaging reale"). Same rationale as candidature/page.tsx —
// a real nav destination, no data, no queries.
// =============================================================================

export default function MessaggiPage() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-zinc-200 px-6 py-16 text-center dark:border-zinc-800">
      <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Messaggi</h1>
      <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
        Qui potrai parlare con i Business con cui collabori. Presto disponibile.
      </p>
    </div>
  );
}
