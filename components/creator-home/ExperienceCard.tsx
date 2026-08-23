'use client';

import { useState } from 'react';

// =============================================================================
// VAYTU — ExperienceCard
// =============================================================================
// A strongly visual card for one opportunity. The favorite heart is a
// local, non-persisted UI toggle only — "favorites reali" (saved anywhere)
// are explicitly out of scope for this phase. The CTA is presentational
// only: there is no Experience detail route yet (Experiences aren't a real
// feature yet), so it intentionally does not navigate anywhere.
// =============================================================================

export interface ExperienceCardProps {
  title: string;
  businessName: string;
  city: string;
  categoryLabel: string;
  tags: string[];
  valueEur: number;
  compatibilityPct: number;
  spotsLeft: number;
  distanceLabel?: string;
  /** CSS gradient/background as a photograph stand-in for demo data. Pass a real image URL once Experiences exist. */
  imageGradient: string;
}

export function ExperienceCard({
  title,
  businessName,
  city,
  categoryLabel,
  tags,
  valueEur,
  compatibilityPct,
  spotsLeft,
  distanceLabel,
  imageGradient,
}: ExperienceCardProps) {
  const [favorite, setFavorite] = useState(false);

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:border-zinc-900 dark:bg-zinc-950">
      <div className="relative aspect-[4/3] w-full" style={{ backgroundImage: imageGradient }}>
        {distanceLabel && (
          <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {distanceLabel}
          </span>
        )}

        <button
          type="button"
          onClick={() => setFavorite((v) => !v)}
          aria-pressed={favorite}
          aria-label={favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-sm backdrop-blur-sm dark:bg-black/60 dark:text-zinc-200"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4.5 w-4.5"
            fill={favorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.7"
            style={favorite ? { color: 'var(--vaytu-green)' } : undefined}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 20.5s-7-4.35-9.5-8.7C1 8.7 2.3 5.5 5.6 5c2-.3 3.7.7 6.4 3.2C14.7 5.7 16.4 4.7 18.4 5c3.3.5 4.6 3.7 3.1 6.8-2.5 4.35-9.5 8.7-9.5 8.7Z"
            />
          </svg>
        </button>

        <span className="absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: 'var(--vaytu-green-soft)', color: 'var(--vaytu-green)' }}>
          {compatibilityPct}% compatibile
        </span>
      </div>

      <div className="space-y-2.5 p-4">
        <div className="space-y-0.5">
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{title}</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {businessName} · {city}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            {categoryLabel}
          </span>
          {tags
            .filter((tag) => tag !== categoryLabel)
            .map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
              >
                {tag}
              </span>
            ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
              Valore indicativo €{valueEur}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {spotsLeft} {spotsLeft === 1 ? 'posto disponibile' : 'posti disponibili'}
            </p>
          </div>

          <span className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-950">
            Scopri
          </span>
        </div>
      </div>
    </article>
  );
}
