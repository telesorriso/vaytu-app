import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth/dal';
import { withTimeout } from '@/lib/actions/timeout';
import type { ReviewRow, ReviewType } from '@/lib/db/types';

/**
 * Gets all reviews received by the authenticated user (as reviewee).
 * Visible to: the reviewee, reviewer, and admin.
 */
export async function getReceivedReviews(): Promise<
  (ReviewRow & {
    reviewer?: {
      display_name?: string;
      avatar_url?: string | null;
    };
  })[]
> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();

  try {
    const { data } = await withTimeout(
      supabase
        .from('reviews')
        .select('*')
        .eq('reviewee_id', user.id)
        .order('created_at', { ascending: false }),
      10_000
    );

    if (!data) return [];

    // Enrich with reviewer info
    const enriched = await Promise.all(
      (data as ReviewRow[]).map(async (review) => {
        try {
          const { data: reviewer } = await withTimeout(
            supabase
              .from('creator_profiles')
              .select('display_name, avatar_url')
              .eq('id', review.reviewer_id)
              .maybeSingle(),
            10_000
          );

          if (!reviewer) {
            const { data: business } = await withTimeout(
              supabase
                .from('business_profiles')
                .select('company_name, logo_url')
                .eq('id', review.reviewer_id)
                .maybeSingle(),
              10_000
            );
            return {
              ...review,
              reviewer: business
                ? {
                    display_name: business.company_name,
                    avatar_url: business.logo_url,
                  }
                : undefined,
            };
          }

          return {
            ...review,
            reviewer,
          };
        } catch {
          return review;
        }
      })
    );

    return enriched;
  } catch {
    return [];
  }
}

/**
 * Gets all reviews written by the authenticated user (as reviewer).
 */
export async function getGivenReviews(): Promise<ReviewRow[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();

  try {
    const { data } = await withTimeout(
      supabase
        .from('reviews')
        .select('*')
        .eq('reviewer_id', user.id)
        .order('created_at', { ascending: false }),
      10_000
    );

    return (data as ReviewRow[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * Creates a review for a completed collaboration.
 * Only valid if:
 * - collaboration.status = 'completed'
 * - reviewer is creator or business in the collaboration
 * - no review already exists from this reviewer for this collaboration
 */
export async function createReview(
  collaborationId: string,
  reviewType: ReviewType,
  rating: number,
  comment?: string
): Promise<ReviewRow | null> {
  const user = await getAuthUser();
  if (!user) return null;

  if (rating < 1 || rating > 5) return null;

  const supabase = await createClient();

  try {
    // Verify collaboration exists and is completed
    const { data: collab } = await withTimeout(
      supabase
        .from('collaborations')
        .select('creator_id, business_id, status')
        .eq('id', collaborationId)
        .maybeSingle(),
      10_000
    );

    if (!collab || collab.status !== 'completed') return null;

    // Determine reviewee based on review_type
    let reviewee_id: string;
    if (reviewType === 'creator_to_business') {
      if (collab.creator_id !== user.id) return null;
      reviewee_id = collab.business_id;
    } else {
      if (collab.business_id !== user.id) return null;
      reviewee_id = collab.creator_id;
    }

    const { data, error } = await withTimeout(
      supabase
        .from('reviews')
        .insert({
          collaboration_id: collaborationId,
          reviewer_id: user.id,
          reviewee_id,
          review_type: reviewType,
          rating,
          comment: comment || null,
        } as ReviewRow)
        .select()
        .single(),
      10_000
    );

    if (error || !data) return null;
    return data as ReviewRow;
  } catch {
    return null;
  }
}

/**
 * Updates an existing review (only reviewer can update).
 */
export async function updateReview(
  reviewId: string,
  rating: number,
  comment?: string
): Promise<{ success?: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: 'Non autenticato' };

  if (rating < 1 || rating > 5) return { error: 'Rating deve essere tra 1 e 5' };

  const supabase = await createClient();

  try {
    const { error } = await withTimeout(
      supabase
        .from('reviews')
        .update({
          rating,
          comment: comment || null,
        })
        .eq('id', reviewId)
        .eq('reviewer_id', user.id),
      10_000
    );

    if (error) return { error: error.message };
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto';
    return { error: message };
  }
}

/**
 * Deletes a review (only reviewer can delete).
 */
export async function deleteReview(reviewId: string): Promise<{ success?: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: 'Non autenticato' };

  const supabase = await createClient();

  try {
    const { error } = await withTimeout(
      supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('reviewer_id', user.id),
      10_000
    );

    if (error) return { error: error.message };
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto';
    return { error: message };
  }
}
