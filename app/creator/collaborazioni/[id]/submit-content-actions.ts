'use server';

import { createSubmission, updateSubmission, deleteSubmission } from '@/lib/submissions/data';

export async function handleSubmitContent(
  deliverableId: string,
  collaborationId: string,
  contentUrl: string,
  platform: string,
  caption?: string
) {
  return createSubmission(collaborationId, deliverableId, contentUrl, platform, caption);
}

export async function handleUpdateSubmission(
  submissionId: string,
  contentUrl: string,
  platform: string,
  caption?: string | null
) {
  return updateSubmission(submissionId, contentUrl, platform, caption);
}

export async function handleDeleteSubmission(submissionId: string) {
  return deleteSubmission(submissionId);
}
