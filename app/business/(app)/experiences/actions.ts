'use server';

import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/dal';
import {
  createExperience,
  updateExperience,
  updateExperienceStatus,
  getExperienceDetail,
} from '@/lib/experiences/data';
import type { ExperienceStatus } from '@/lib/db/types';
import { toUserMessage } from '@/lib/actions/errors';

export interface ExperienceFormState {
  error?: string;
  success?: boolean;
}

/**
 * Creates a new experience from form data.
 */
export async function submitCreateExperience(
  _prevState: ExperienceFormState,
  formData: FormData
): Promise<ExperienceFormState> {
  let createdId: string | null = null;

  try {
    await requireRole('business');

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const city = formData.get('city') as string;
    const country = formData.get('country') as string;
    const compensationType = formData.get('compensationType') as string;
    const compensationValue = formData.get('compensationValue') as string;
    const compensationDetails = formData.get('compensationDetails') as string;
    const requirements = formData.get('requirements') as string;
    const maxCreators = formData.get('maxCreators') as string;

    // Validation
    if (!title || !description) {
      return { error: 'Titolo e descrizione sono obbligatori.' };
    }

    const experience = await createExperience({
      title: title.trim(),
      description: description.trim(),
      category: category?.trim() || null,
      city: city?.trim() || null,
      country: country?.trim() || null,
      compensation_type: (compensationType || 'other') as 'free_stay' | 'free_product' | 'paid' | 'paid_plus_product' | 'other',
      compensation_value: compensationValue ? parseFloat(compensationValue) : null,
      compensation_details: compensationDetails?.trim() || null,
      requirements: requirements?.trim() || null,
      min_level_id: null,
      max_creators: maxCreators ? parseInt(maxCreators) : 1,
      application_deadline: null,
    });

    if (!experience) {
      return { error: 'Errore nel creare l\'experience. Riprova.' };
    }

    createdId = experience.id;
  } catch (err) {
    const message = toUserMessage(err);
    return { error: message };
  }

  // redirect() throws internally and must be called outside try/catch (see
  // app/creator/experiences/[id]/actions.ts for the full explanation and the
  // Next.js docs citation). Calling it inside the block above meant the
  // catch there swallowed every successful creation's redirect and reported
  // it as a generic error — the experience was created, but the business
  // only ever saw a failure message and never reached the edit page.
  redirect(`/business/experiences/${createdId}`);
}

/**
 * Updates an existing experience from form data.
 */
export async function submitUpdateExperience(
  experienceId: string,
  _prevState: ExperienceFormState,
  formData: FormData
): Promise<ExperienceFormState> {
  try {
    await requireRole('business');

    // Verify ownership
    const current = await getExperienceDetail(experienceId);
    if (!current) {
      return { error: 'Experience non trovata o non hai accesso.' };
    }

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const city = formData.get('city') as string;
    const country = formData.get('country') as string;
    const compensationType = formData.get('compensationType') as string;
    const compensationValue = formData.get('compensationValue') as string;
    const compensationDetails = formData.get('compensationDetails') as string;
    const requirements = formData.get('requirements') as string;
    const maxCreators = formData.get('maxCreators') as string;

    // Validation
    if (!title || !description) {
      return { error: 'Titolo e descrizione sono obbligatori.' };
    }

    const result = await updateExperience(experienceId, {
      title: title.trim(),
      description: description.trim(),
      category: category?.trim() || null,
      city: city?.trim() || null,
      country: country?.trim() || null,
      compensation_type: (compensationType || 'other') as 'free_stay' | 'free_product' | 'paid' | 'paid_plus_product' | 'other',
      compensation_value: compensationValue ? parseFloat(compensationValue) : null,
      compensation_details: compensationDetails?.trim() || null,
      requirements: requirements?.trim() || null,
      max_creators: maxCreators ? parseInt(maxCreators) : 1,
    });

    if (!result) {
      return { error: 'Errore nell\'aggiornamento. Riprova.' };
    }

    return { success: true };
  } catch (err) {
    const message = toUserMessage(err);
    return { error: message };
  }
}

/**
 * Changes an experience's status (publish, pause, archive).
 */
export async function submitChangeStatus(
  experienceId: string,
  status: ExperienceStatus,
  _prevState: ExperienceFormState
): Promise<ExperienceFormState> {
  try {
    await requireRole('business');

    // Verify ownership
    const current = await getExperienceDetail(experienceId);
    if (!current) {
      return { error: 'Experience non trovata o non hai accesso.' };
    }

    // Validate status transition
    const validTransitions: Record<ExperienceStatus, ExperienceStatus[]> = {
      draft: ['published', 'archived'],
      published: ['paused', 'closed', 'archived'],
      paused: ['published', 'closed', 'archived'],
      closed: ['published', 'archived'],
      archived: [],
    };

    if (!validTransitions[current.status].includes(status)) {
      return {
        error: `Transizione non valida da ${current.status} a ${status}.`,
      };
    }

    const result = await updateExperienceStatus(experienceId, status);
    if (!result) {
      return { error: 'Errore nell\'aggiornamento dello stato. Riprova.' };
    }

    return { success: true };
  } catch (err) {
    const message = toUserMessage(err);
    return { error: message };
  }
}
