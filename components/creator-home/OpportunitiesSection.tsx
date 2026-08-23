'use client';

import { useMemo, useState } from 'react';
import { OpportunityFilters, type OpportunityFilter } from './OpportunityFilters';
import { ExperienceCard } from './ExperienceCard';
import { EmptyOpportunities } from './EmptyOpportunities';
import type { DemoExperience, DemoExperienceCategory } from '@/lib/demo/experiences';

// =============================================================================
// VAYTU — OpportunitiesSection
// =============================================================================
// Glue between the filter row and the card grid. Filtering is intentionally
// simple (one category match, no ranking/matching algorithm) — this is UI
// foundation, not the real matching feature. "Vicino a me" has no
// distance/geo data source yet, so it honestly falls through to the empty
// state rather than pretending to filter by location.
// =============================================================================

const FILTER_TO_CATEGORY: Partial<Record<OpportunityFilter, DemoExperienceCategory>> = {
  Food: 'food',
  Wellness: 'wellness',
  Altro: 'lifestyle',
};

export function OpportunitiesSection({ experiences }: { experiences: DemoExperience[] }) {
  const [active, setActive] = useState<OpportunityFilter>('Tutte');

  const filtered = useMemo(() => {
    if (active === 'Tutte') return experiences;
    const category = FILTER_TO_CATEGORY[active];
    if (!category) return []; // "Vicino a me" / "Beauty": no matching data source yet
    return experiences.filter((exp) => exp.category === category);
  }, [experiences, active]);

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Opportunità per te</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Experiences selezionate in base al tuo profilo.
        </p>
      </div>

      <OpportunityFilters active={active} onChange={setActive} />

      {filtered.length === 0 ? (
        <EmptyOpportunities />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((exp) => (
            <ExperienceCard
              key={exp.id}
              title={exp.title}
              businessName={exp.businessName}
              city={exp.city}
              categoryLabel={exp.categoryLabel}
              tags={exp.tags}
              valueEur={exp.valueEur}
              compatibilityPct={exp.compatibilityPct}
              spotsLeft={exp.spotsLeft}
              imageGradient={exp.imageGradient}
            />
          ))}
        </div>
      )}
    </section>
  );
}
