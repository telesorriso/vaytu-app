// =============================================================================
// VAYTU — Candidature (placeholder)
// =============================================================================
// Real applications are explicitly out of scope for this phase (see PROJECT
// instructions: "applications reali"). This route exists only so
// CreatorBottomNav / CreatorSidebar have a real destination instead of a
// dead link — no data, no queries beyond the auth guard already run in
// layout.tsx.
// =============================================================================

export default function CandidaturePage() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-zinc-200 px-6 py-16 text-center dark:border-zinc-800">
      <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Candidature</h1>
      <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
        Qui vedrai lo stato delle tue candidature alle Experiences. Presto disponibile.
      </p>
    </div>
  );
}
