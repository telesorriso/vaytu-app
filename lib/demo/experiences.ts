// =============================================================================
// VAYTU — DEMO-ONLY mock Experiences for the Creator Home UI (V1)
// =============================================================================
// Experiences are NOT implemented yet: no table, no schema change (see
// /supabase/migrations — untouched by this phase). This file is a
// throwaway, purely presentational mock layer used ONLY to preview the
// Creator Home visual design before the real feature exists.
//
// It never touches Supabase — no query, no insert, nothing here is ever
// persisted anywhere or read from the database. isDemoDataEnabled() gates
// it out of real Production: a real Netlify Production deploy always shows
// the elegant empty state instead (see EmptyOpportunities), never this mock
// content. Only local dev and Netlify Deploy Previews / branch deploys see
// it, so it can never contaminate what a real user sees.
//
// Delete this whole file — and the isDemoDataEnabled() branch in
// OpportunitiesSection — the day real Experiences ship. Nothing else in the
// app imports from here.
// =============================================================================

export type DemoExperienceCategory = 'food' | 'wellness' | 'lifestyle';

export interface DemoExperience {
  id: string;
  title: string;
  businessName: string;
  city: string;
  category: DemoExperienceCategory;
  categoryLabel: string;
  /** One short line — the actual offer, shown on the card ("Cena per 2 persone"). */
  benefit: string;
  valueEur: number;
  tags: string[];
  compatibilityPct: number;
  spotsLeft: number;
  /** Real photo URL, once Experiences exist — none of the demo items set this yet. */
  imageUrl?: string;
  /** CSS gradient used as a photograph stand-in — no external image host. */
  imageGradient: string;
}

export const DEMO_EXPERIENCES: DemoExperience[] = [
  {
    id: 'demo-1',
    title: 'Cena Experience',
    businessName: 'Osteria Lumen',
    city: 'Milano',
    category: 'food',
    categoryLabel: 'Food',
    benefit: 'Cena per 2 persone',
    valueEur: 120,
    tags: ['Cena'],
    compatibilityPct: 92,
    spotsLeft: 2,
    imageGradient: 'linear-gradient(135deg, #e9ddc8 0%, #c9a35f 55%, #a9822f 100%)',
  },
  {
    id: 'demo-2',
    title: 'Wellness Experience',
    businessName: 'Aura Spa',
    city: 'Milano',
    category: 'wellness',
    categoryLabel: 'Wellness',
    benefit: 'Percorso spa per 1 persona',
    valueEur: 90,
    tags: ['Relax'],
    compatibilityPct: 87,
    spotsLeft: 3,
    imageGradient: 'linear-gradient(135deg, #e3ede8 0%, #a9c6b8 55%, #6f9c85 100%)',
  },
  {
    id: 'demo-3',
    title: 'Shopping Experience',
    businessName: 'Atelier Nova',
    city: 'Milano',
    category: 'lifestyle',
    categoryLabel: 'Lifestyle',
    benefit: 'Personal shopper incluso',
    valueEur: 150,
    tags: ['Shopping'],
    compatibilityPct: 78,
    spotsLeft: 1,
    imageGradient: 'linear-gradient(135deg, #efe2ea 0%, #cba7bd 55%, #9c6f8c 100%)',
  },
];

/**
 * True in local dev and on a Netlify Deploy Preview / branch deploy; false
 * on a real Netlify Production deploy. Netlify sets CONTEXT at build time
 * ('production' | 'deploy-preview' | 'branch-deploy' | 'dev'); it is unset
 * entirely outside Netlify (a plain local `next dev`/`next build`), which
 * is also treated as non-production so the demo still renders locally.
 */
export function isDemoDataEnabled(): boolean {
  return process.env.CONTEXT !== 'production';
}
