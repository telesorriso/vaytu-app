'use client';

import { useState } from 'react';

// =============================================================================
// VAYTU — ExperienceCard
// =============================================================================
// Image-first, minimal content. The photo area is a real 16:9 slot: pass
// `imageUrl` once a real Experience photo exists and it renders full-bleed
// with object-cover; until then `imageGradient` is the visual placeholder —
// no external image host, no new dependency.
//
// The favorite heart is a local, non-persisted UI toggle only —
// "favorites reali" (saved anywhere) stay out of scope for this phase. The
// trailing chevron is the same kind of presentational-only affordance:
// there is no Experience detail route yet, so nothing here navigates.
// =============================================================================

export interface ExperienceCardProps {
  title: string;
  businessName: string;
  city: string;
  /** One short line — the actual offer ("Cena per 2 persone"), not a metric. */
  benefit: string;
  /** Discrete chips (category first). Kept muted — not the visual focus. */
  tags: string[];
  distanceLabel?: string;
  /** Real photo, once Experiences exist. Falls back to imageGradient when absent. */
  imageUrl?: string;
  imageGradient: string;
}

export function ExperienceCard({
  title,
  businessName,
  city,
  benefit,
  tags,
  distanceLabel,
  imageUrl,
  imageGradient,
}: ExperienceCardProps) {
  const [favorite, setFavorite] = useState(false);

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:border-zinc-900 dark:bg-zinc-950">
      <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-900">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- no next/image remotePatterns configured for this phase
          <img src={imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ backgroundImage: imageGradient, backgroundSize: 'cover' }} />
        )}

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
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-sm backdrop-blur-sm dark:bg-black/60 dark:text-zinc-200"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[18px] w-[18px]"
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

      </div>

      <div className="space-y-1.5 p-3.5">
        <div className="space-y-0.5">
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{title}</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {businessName} · {city}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">{benefit}</p>
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-700"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 5.5 6.5 6.5-6.5 6.5" />
          </svg>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-500"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
