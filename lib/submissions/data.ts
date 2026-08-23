'use server';

import { withTimeout } from '@/lib/actions/timeout';
import { createClient } from '@/lib/supabase/server';
import type { ContentSubmissionRow } from '@/lib/db/types';

/**
 * Create a new content submission for a deliverable.
 * Only the creator of the collaboration can submit.
 * Requires: collaboration is active, deliverable exists and is pending/submitted.
 */
export async function createSubmission(
  deliverableId: string,
  collaborationId: string,
  contentUrl: string,
  platform: string,
  caption?: string
): Promise<ContentSubmissionRow | null> {
  const client = await createClient();
  const insertPromise = client
    .from('content_submissions')
    .insert({
      deliverable_id: deliverableId,
      collaboration_id: collaborationId,
      content_url: contentUrl,
      platform,
      caption: caption || null,
      status: 'pending_review',
    })
    .select()
    .single();

  const { data, error } = await withTimeout(insertPromise, 10_000);

  if (error) {
    console.error('Error creating submission:', error);
    return null;
  }

  return data;
}

/**
 * Get all submissions for a collaboration (creator view).
 * Includes deliverable info.
 */
export async function getCollaborationSubmissions(
  collaborationId: string
): Promise<
  Array<
    ContentSubmissionRow & {
      deliverable?: {
        id: string;
        deliverable_type: string;
        due_date: string | null;
        status: string;
      };
    }
  >
> {
  const client = await createClient();
  const selectPromise = client
    .from('content_submissions')
    .select(
      `
      *,
      deliverable:collaboration_deliverables(
        id,
        deliverable_type,
        due_date,
        status
      )
    `
    )
    .eq('collaboration_id', collaborationId)
    .order('submitted_at', { ascending: false });

  const { data, error } = await withTimeout(selectPromise, 10_000);

  if (error) {
    console.error('Error fetching submissions:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single submission by ID (for editing/viewing).
 * Checks authorization: must be the creator of the collaboration.
 */
export async function getSubmissionDetail(
  submissionId: string
): Promise<ContentSubmissionRow | null> {
  const client = await createClient();
  const selectPromise = client
    .from('content_submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  const { data, error } = await withTimeout(selectPromise, 10_000);

  if (error) {
    console.error('Error fetching submission:', error);
    return null;
  }

  return data;
}

/**
 * Update a submission (creator can only update their own, only if status is pending_review).
 * Allows updating: content_url, platform, caption.
 */
export async function updateSubmission(
  submissionId: string,
  contentUrl?: string,
  platform?: string,
  caption?: string | null
): Promise<ContentSubmissionRow | null> {
  const client = await createClient();

  const updates: Record<string, string | null> = {};
  if (contentUrl !== undefined) updates.content_url = contentUrl;
  if (platform !== undefined) updates.platform = platform;
  if (caption !== undefined) updates.caption = caption;

  if (Object.keys(updates).length === 0) {
    return null;
  }

  const updatePromise = client
    .from('content_submissions')
    .update(updates)
    .eq('id', submissionId)
    .select()
    .single();

  const { data, error } = await withTimeout(updatePromise, 10_000);

  if (error) {
    console.error('Error updating submission:', error);
    return null;
  }

  return data;
}

/**
 * Delete a submission (creator can only delete their own, only if status is pending_review).
 */
export async function deleteSubmission(submissionId: string): Promise<boolean> {
  const client = await createClient();
  const deletePromise = client
    .from('content_submissions')
    .delete()
    .eq('id', submissionId);

  const { error } = await withTimeout(deletePromise, 10_000);

  if (error) {
    console.error('Error deleting submission:', error);
    return false;
  }

  return true;
}

/**
 * Get pending submissions for a deliverable (for checking if already submitted).
 */
export async function getDeliverableSubmissions(
  deliverableId: string
): Promise<ContentSubmissionRow[]> {
  const client = await createClient();
  const selectPromise = client
    .from('content_submissions')
    .select('*')
    .eq('deliverable_id', deliverableId)
    .order('submitted_at', { ascending: false });

  const { data, error } = await withTimeout(selectPromise, 10_000);

  if (error) {
    console.error('Error fetching deliverable submissions:', error);
    return [];
  }

  return data || [];
}
