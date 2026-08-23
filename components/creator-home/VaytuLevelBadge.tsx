// =============================================================================
// VAYTU — VaytuLevelBadge
// =============================================================================
// Proprietary/premium treatment for the Creator's Vaytu Level. This is
// deliberately NOT styled like a stat or a metric — no bar, no number, no
// progress indicator. A level name in a warm-gold pill with a small mark,
// nothing else. Only the four canonical levels exist (see
// /supabase/migrations/009_seed_creator_levels.sql) — this component never
// invents one: a creator with no level assigned yet gets an honest neutral
// "in assegnazione" state instead of a fabricated default.
// =============================================================================

export function VaytuLevelBadge({ levelName }: { levelName: string | null }) {
  if (!levelName) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Livello in assegnazione
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
      style={{
        background: 'var(--vaytu-gold-soft)',
        color: 'var(--vaytu-gold-foreground)',
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3 w-3 shrink-0"
        style={{ color: 'var(--vaytu-gold)' }}
      >
        <path
          fill="currentColor"
          d="M8 0.5 9.8 5.4l5.2.4-4 3.4L12.3 15 8 12.1 3.7 15l1.3-5.8-4-3.4 5.2-.4L8 .5Z"
        />
      </svg>
      Vaytu {levelName}
    </span>
  );
}
