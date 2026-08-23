'use client';

import { useMemo, useState } from 'react';
import { OpportunityFilters, type OpportunityFilter } from './OpportunityFilters';
import { ExperienceCard } from './ExperienceCard';
import { EmptyOpportunities } from './EmptyOpportunities';
import type { DemoExperience, DemoExperienceCategory } from '@/lib/demo/experiences';
import type { ExperienceRow } from '@/lib/db/types';

// =============================================================================
// VAYTU — OpportunitiesSection
// =============================================================================
// Glue between the filter row and the card grid. Filtering is intentionally
// simple (one category match, no ranking/matching algorithm) — this is UI
// foundation, not the real matching feature. "Vicino a me" has no
// distance/geo data source yet, so it honestly falls through to the empty
// state rather than pretending to filter by location.
//
// Accepts both DemoExperience (from demo mode) and ExperienceRow (from DB).
// For real experiences, businessName is looked up separately and passed through.
// =============================================================================

const FILTER_TO_CATEGORY: Partial<Record<OpportunityFilter, DemoExperienceCategory | string>> = {
  Food: 'food',
  Wellness: 'wellness',
  Altro: 'lifestyle',
};

interface ExperienceWithBusinessName extends ExperienceRow {
  businessName?: string;
}

export function OpportunitiesSection({
  experiences,
}: {
  experiences: DemoExperience[] | ExperienceWithBusinessName[];
}) {
  const [active, setActive] = useState<OpportunityFilter>('Tutte');

  const filtered = useMemo(() => {
    if (active === 'Tutte') return experiences;
    const category = FILTER_TO_CATEGORY[active];
    if (!category) return []; // "Vicino a me" / "Beauty": no matching data source yet
    return experiences.filter((exp) => {
      // Handle both demo and real experiences
      if ('category' in exp && (exp as ExperienceRow).category) {
        return (exp as ExperienceRow).category === category;
      }
      if ('category' in exp && (exp as DemoExperience).category) {
        return (exp as DemoExperience).category === category;
      }
      return false;
    });
  }, [experiences, active]);

  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
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
          {filtered.map((exp) => {
            // Check if this is a demo experience or a real one
            const isDemoExp = 'benefit' in exp;

            if (isDemoExp) {
              const demo = exp as DemoExperience;
              return (
                <ExperienceCard
                  key={demo.id}
                  title={demo.title}
                  businessName={demo.businessName}
                  city={demo.city}
                  benefit={demo.benefit}
                  tags={[demo.categoryLabel, ...demo.tags.filter((tag) => tag !== demo.categoryLabel)]}
                  compatibilityPct={demo.compatibilityPct}
                  imageGradient={demo.imageGradient}
                  imageUrl={demo.imageUrl}
                />
              );
            } else {
              // Real experience
              const real = exp as ExperienceWithBusinessName;
              return (
                <ExperienceCard
                  key={real.id}
                  title={real.title}
                  businessName={real.businessName || 'Business'}
                  city={real.city || 'Luogo sconosciuto'}
                  benefit={
                    real.compensation_type === 'paid' && real.compensation_value
                      ? `€${real.compensation_value}`
                      : real.compensation_type
                          .split('_')
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ') || 'Esperienza'
                  }
                  tags={real.category ? [real.category] : []}
                  compatibilityPct={75} // TODO: implement matching algorithm
                  imageGradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  imageUrl={undefined}
                />
              );
            }
          })}
        </div>
      )}
    </section>
  );
}
