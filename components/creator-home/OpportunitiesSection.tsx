'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { OpportunityFilters, type OpportunityFilter } from './OpportunityFilters';
import { ExperienceCard } from './ExperienceCard';
import { EmptyOpportunities } from './EmptyOpportunities';
import type { ExperienceRow } from '@/lib/db/types';

// =============================================================================
// VAYTU — OpportunitiesSection
// =============================================================================
// Glue between the filter row and the card grid, over REAL published
// Experiences only. The demo/mock data path was removed in FASE 10: real
// Experiences now ship, so showing fabricated cards in Deploy Previews would
// mean testers reviewing content that does not exist.
//
// Filtering is one category match, no ranking — matching is out of scope, and
// the card no longer claims a "% compatibile" score because nothing computes
// one. "Vicino a me" has no geo data source, so it honestly falls through to
// the empty state rather than pretending to filter by distance.
// =============================================================================

const FILTER_TO_CATEGORY: Partial<Record<OpportunityFilter, string>> = {
  Food: 'food',
  Wellness: 'wellness',
  Altro: 'lifestyle',
};

interface ExperienceWithBusinessName extends ExperienceRow {
  businessName?: string;
}

function compensationLabel(exp: ExperienceRow): string {
  if (exp.compensation_type === 'paid' && exp.compensation_value) {
    return `€${exp.compensation_value}`;
  }
  return (
    exp.compensation_type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'Esperienza'
  );
}

export function OpportunitiesSection({
  experiences,
}: {
  experiences: ExperienceWithBusinessName[];
}) {
  const [active, setActive] = useState<OpportunityFilter>('Tutte');

  const filtered = useMemo(() => {
    if (active === 'Tutte') return experiences;
    const category = FILTER_TO_CATEGORY[active];
    if (!category) return []; // "Vicino a me" / "Beauty": no matching data source yet
    return experiences.filter((exp) => exp.category === category);
  }, [experiences, active]);

  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Opportunità per te</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Le Experiences pubblicate dai Business.
        </p>
      </div>

      <OpportunityFilters active={active} onChange={setActive} />

      {filtered.length === 0 ? (
        <EmptyOpportunities />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((exp) => (
            <Link
              key={exp.id}
              href={`/creator/experiences/${exp.id}`}
              className="transition-shadow hover:shadow-lg"
            >
              <ExperienceCard
                title={exp.title}
                businessName={exp.businessName || 'Business'}
                city={exp.city || 'Luogo non indicato'}
                benefit={compensationLabel(exp)}
                tags={exp.category ? [exp.category] : []}
                imageGradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                imageUrl={undefined}
              />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
