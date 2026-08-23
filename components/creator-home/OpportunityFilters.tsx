'use client';

// =============================================================================
// VAYTU — OpportunityFilters
// =============================================================================
// A horizontally-scrollable row of filter pills. Purely presentational +
// controlled selection — no filtering logic lives here (kept in the parent,
// see OpportunitiesSection), and no geolocation/matching logic exists yet
// for "Vicino a me" — deliberately simple for V1, per instructions.
// =============================================================================

export const OPPORTUNITY_FILTERS = ['Tutte', 'Vicino a me', 'Food', 'Beauty', 'Wellness', 'Altro'] as const;
export type OpportunityFilter = (typeof OPPORTUNITY_FILTERS)[number];

export function OpportunityFilters({
  active,
  onChange,
}: {
  active: OpportunityFilter;
  onChange: (filter: OpportunityFilter) => void;
}) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {OPPORTUNITY_FILTERS.map((filter) => {
        const isActive = filter === active;
        return (
          <button
            key={filter}
            type="button"
            onClick={() => onChange(filter)}
            aria-pressed={isActive}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'border-zinc-950 bg-zinc-950 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950'
                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400'
            }`}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
}
