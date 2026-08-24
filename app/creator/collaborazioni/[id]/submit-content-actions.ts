'use server';

import { createContentSubmission } from '@/lib/collaborations/data';
import type { PlatformType } from '@/lib/db/types';

// =============================================================================
// VAYTU — Content submission action
// =============================================================================
// Delegates to createContentSubmission() in lib/collaborations/data.ts, which
// already sets every required column and checks ownership.
//
// This previously called a second, parallel implementation in
// lib/submissions/data.ts that was broken twice over: the two id arguments
// were passed in the wrong order, and the insert omitted creator_id and
// business_id, which are NOT NULL with no default. Every submission failed.
// That module has been deleted rather than repaired — it duplicated working
// code, and its `'use server'` directive published six data-access functions
// as remotely callable endpoints instead of the codebase's `server-only`.
// =============================================================================

/** platform_type enum (migration 001). Anything else is rejected. */
const PLATFORMS: readonly PlatformType[] = [
  'instagram',
  'tiktok',
  'youtube',
  'facebook',
  'x',
  'linkedin',
  'other',
];

function isPlatform(value: string): value is PlatformType {
  return (PLATFORMS as readonly string[]).includes(value);
}

export async function handleSubmitContent(
  deliverableId: string,
  collaborationId: string,
  contentUrl: string,
  platform: string,
  caption?: string
) {
  // The form only offers enum values, but a form post is not a control: an
  // invalid platform would otherwise reach Postgres as an enum cast error.
  if (!isPlatform(platform)) return null;

  return createContentSubmission(collaborationId, deliverableId, {
    content_url: contentUrl,
    platform,
    caption,
  });
}
