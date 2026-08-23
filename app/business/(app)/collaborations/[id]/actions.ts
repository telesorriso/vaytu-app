'use server';

import { revalidatePath } from 'next/cache';
import { createReview } from '@/lib/reviews/data';
import {
  canCompleteCollaboration,
  updateCollaborationStatus,
} from '@/lib/collaborations/data';

export async function submitBusinessReview(
  collaborationId: string,
  rating: number,
  comment?: string
) {
  return createReview(collaborationId, 'business_to_creator', rating, comment);
}

/**
 * Marks a collaboration completed on behalf of the owning Business.
 *
 * Completion is gated twice: canCompleteCollaboration() re-checks server-side
 * that every deliverable is approved (the button is also hidden when it is
 * not, but a hidden button is not a control), and updateCollaborationStatus()
 * scopes the write to business_id = auth.uid(). RLS is the final boundary.
 */
export async function completeCollaboration(
  collaborationId: string
): Promise<{ success?: boolean; error?: string }> {
  const gate = await canCompleteCollaboration(collaborationId);
  if (!gate.canComplete) {
    return { error: gate.reason ?? 'Questa collaborazione non può essere completata.' };
  }

  const result = await updateCollaborationStatus(collaborationId, 'completed');
  if (result.error) return result;

  revalidatePath(`/business/collaborations/${collaborationId}`);
  return { success: true };
}
