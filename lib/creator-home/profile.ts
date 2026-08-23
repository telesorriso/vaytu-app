import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { withTimeout } from '@/lib/actions/timeout';

export interface CollaborationHistoryItem {
  id: string;
  status: string;
  created_at: string;
  experience?: {
    title: string;
  };
}

/**
 * Get collaboration history for the authenticated creator
 * Shows recent completed collaborations with basic info
 */
export async function getCreatorCollaborationHistory(limit = 10): Promise<CollaborationHistoryItem[]> {
  const supabase = await createClient();

  try {
    const selectPromise = supabase
      .from('collaborations')
      .select(
        `
        id,
        status,
        created_at,
        experience:experiences(
          title
        )
      `
      )
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error } = await withTimeout(selectPromise, 10_000);

    if (error) {
      console.error('Error fetching collaboration history:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getCreatorCollaborationHistory:', err);
    return [];
  }
}

/**
 * Get reviews received by creator (already exists in reviews/data.ts, this is a wrapper for convenience)
 * Returns count of 5-star and average rating
 */
export async function getCreatorReviewStats() {
  const supabase = await createClient();

  try {
    const selectPromise = supabase
      .from('reviews')
      .select('rating')
      .eq('review_type', 'business_to_creator');

    const { data, error } = await withTimeout(selectPromise, 10_000);

    if (error) {
      console.error('Error fetching review stats:', error);
      return { count: 0, average: 0, fiveStarCount: 0 };
    }

    if (!data || data.length === 0) {
      return { count: 0, average: 0, fiveStarCount: 0 };
    }

    const ratings = data.map((r) => r.rating) as number[];
    const average = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
    const fiveStarCount = ratings.filter((r) => r === 5).length;

    return { count: ratings.length, average, fiveStarCount };
  } catch (err) {
    console.error('Error in getCreatorReviewStats:', err);
    return { count: 0, average: 0, fiveStarCount: 0 };
  }
}
