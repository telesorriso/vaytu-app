'use server';

import { createReview } from '@/lib/reviews/data';

export async function submitBusinessReview(
  collaborationId: string,
  rating: number,
  comment?: string
) {
  return createReview(collaborationId, 'business_to_creator', rating, comment);
}
