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
  let succeeded = false;

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

    succeeded = true;
  } catch (err) {
    const message = toUserMessage(err, 'submitApplication');
    return { error: message };
  }

  // redirect() throws internally (Next.js: "redirect throws an error so it
  // should be called outside the try block when using try/catch
  // statements" — see node_modules/next/dist/docs/01-app/02-guides/redirecting.md).
  // Calling it inside the block above meant the catch there swallowed the
  // throw on every SUCCESSFUL submission and reported it as a generic
  // error — the application was created, but the creator only ever saw a
  // failure message and never reached /creator/candidature.
  if (succeeded) {
    redirect('/creator/candidature');
  }
  return {};
}
