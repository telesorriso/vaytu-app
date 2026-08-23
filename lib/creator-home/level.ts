import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { CreatorLevelRow } from '@/lib/db/types';

/**
 * Looks up a single Vaytu Level row by id (a Creator's own
 * creator_profiles.current_level_id). Returns null both when the creator
 * has no level assigned yet (nullable column — admin assigns it manually,
 * see /app/admin/creators/[id]/level-form.tsx) and on any read failure —
 * callers must render a "not yet assigned" state, never fabricate a level.
 *
 * Scoped by the caller's own session; RLS (creator_levels is public
 * reference data, readable by any authenticated role) is the real backstop.
 */
export async function getCreatorLevel(levelId: string | null): Promise<CreatorLevelRow | null> {
  if (!levelId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('creator_levels')
    .select('*')
    .eq('id', levelId)
    .maybeSingle();
  return (data as CreatorLevelRow | null) ?? null;
}
