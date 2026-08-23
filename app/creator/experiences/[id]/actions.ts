'use server';

import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/dal';
import { createApplication } from '@/lib/experiences/data';
import { toUserMessage } from '@/lib/actions/errors';

export interface ApplicationActionState {
  error?: string;
  success?: boolean;
  [key: string]: string | boolean | undefined;
}

/**
 * Submits a new application from a creator to an experience.
 */
export async function submitApplication(
  experienceId: string,
  _prevState: ApplicationActionState,
  formData: FormData
): Promise<ApplicationActionState> {
  try {
    await requireRole('creator');

    const message = formData.get('message') as string;

    if (!message || message.trim().length === 0) {
      return { error: 'Il messaggio è obbligatorio.' };
    }

    const application = await createApplication(experienceId, message);

    if (!application) {
      return { error: 'Errore nell\'invio della candidatura. Riprova più tardi.' };
    }

    // Redirect to a success or status page
    redirect('/creator/candidature');
  } catch (err) {
    const message = toUserMessage(err);
    return { error: message };
  }
}
