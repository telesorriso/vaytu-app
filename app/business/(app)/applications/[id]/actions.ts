'use server';

import { requireRole } from '@/lib/auth/dal';
import { updateApplicationStatus as updateApplicationStatusInDb } from '@/lib/experiences/data';
import type { ApplicationStatus } from '@/lib/db/types';
import { toUserMessage } from '@/lib/actions/errors';

export interface ApplicationActionState {
  success?: boolean;
  error?: string;
  [key: string]: string | boolean | undefined;
}

/**
 * Updates application status to accept or reject.
 * When accepting, the database trigger automatically creates a Collaboration.
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
): Promise<ApplicationActionState> {
  try {
    await requireRole('business');

    const result = await updateApplicationStatusInDb(applicationId, status);

    if (result.success) {
      return { success: true };
    } else if (result.error) {
      return { error: result.error };
    }

    return { error: 'Errore sconosciuto' };
  } catch (err) {
    const message = toUserMessage(err);
    return { error: message };
  }
}
