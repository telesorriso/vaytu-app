'use server';

import { createReview } from '@/lib/reviews/data';
import type { ReviewType } from '@/lib/db/types';

export async function submitCreatorReview(
  collaborationId: string,
  rating: number,
  comment?: string
) {
  return createReview(collaborationId, 'creator_to_business', rating, comment);
}
