import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth/dal';
import { withTimeout } from '@/lib/actions/timeout';
import { toUserMessage } from '@/lib/actions/errors';
import type {
  CollaborationRow,
  CollaborationDeliverableRow,
  ContentSubmissionRow,
  CollaborationStatus,
  DeliverableStatus,
  SubmissionStatus,
  DeliverableType,
  PlatformType,
} from '@/lib/db/types';

/**
 * Gets all collaborations for the authenticated creator.
 */
export async function getCreatorCollaborations(): Promise<
  (CollaborationRow & {
    experienceTitle?: string;
    businessName?: string;
  })[]
> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();

  try {
    const { data } = await withTimeout(
      supabase
        .from('collaborations')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false }),
      10_000
    );

    if (!data) return [];

    // Enrich with experience and business info
    const enriched = await Promise.all(
      (data as CollaborationRow[]).map(async (collab) => {
        try {
          const { data: exp } = await withTimeout(
            supabase
              .from('experiences')
              .select('title')
              .eq('id', collab.experience_id)
              .maybeSingle(),
            10_000
          );

          const { data: biz } = await withTimeout(
            supabase
              .from('business_profiles')
              .select('company_name')
              .eq('id', collab.business_id)
              .maybeSingle(),
            10_000
          );

          return {
            ...collab,
            experienceTitle: exp?.title,
            businessName: biz?.company_name,
          };
        } catch {
          return collab;
        }
      })
    );

    return enriched;
  } catch {
    return [];
  }
}

/**
 * Gets all collaborations for the authenticated business.
 */
export async function getBusinessCollaborations(): Promise<
  (CollaborationRow & {
    experienceTitle?: string;
    creatorName?: string;
  })[]
> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();

  try {
    const { data } = await withTimeout(
      supabase
        .from('collaborations')
        .select('*')
        .eq('business_id', user.id)
        .order('created_at', { ascending: false }),
      10_000
    );

    if (!data) return [];

    // Enrich with experience and creator info
    const enriched = await Promise.all(
      (data as CollaborationRow[]).map(async (collab) => {
        try {
          const { data: exp } = await withTimeout(
            supabase
              .from('experiences')
              .select('title')
              .eq('id', collab.experience_id)
              .maybeSingle(),
            10_000
          );

          const { data: creator } = await withTimeout(
            supabase
              .from('creator_profiles')
              .select('display_name')
              .eq('id', collab.creator_id)
              .maybeSingle(),
            10_000
          );

          return {
            ...collab,
            experienceTitle: exp?.title,
            creatorName: creator?.display_name,
          };
        } catch {
          return collab;
        }
      })
    );

    return enriched;
  } catch {
    return [];
  }
}

/**
 * Gets collaboration detail with related data.
 * Enforces RLS via query filter (creator_id OR business_id = auth.uid()).
 */
export async function getCollaborationDetail(collaborationId: string): Promise<
  (CollaborationRow & {
    experience?: {
      title: string;
      description: string;
      category?: string;
      city?: string;
      requirements?: string;
      compensation_type: string;
      compensation_value?: number;
    };
    creator?: {
      display_name: string;
      avatar_url: string | null;
      city?: string;
      niches: string[];
    };
    business?: {
      company_name: string;
      logo_url?: string;
      city?: string;
    };
  }) | null
> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();

  try {
    // Get collaboration - RLS will filter
    const { data: collab } = await withTimeout(
      supabase
        .from('collaborations')
        .select('*')
        .eq('id', collaborationId)
        .maybeSingle(),
      10_000
    );

    if (!collab) return null;

    // Get experience
    const { data: experience } = await withTimeout(
      supabase
        .from('experiences')
        .select(
          'title, description, category, city, requirements, compensation_type, compensation_value'
        )
        .eq('id', (collab as CollaborationRow).experience_id)
        .maybeSingle(),
      10_000
    );

    // Get creator profile
    const { data: creator } = await withTimeout(
      supabase
        .from('creator_profiles')
        .select('display_name, avatar_url, city, niches')
        .eq('id', (collab as CollaborationRow).creator_id)
        .maybeSingle(),
      10_000
    );

    // Get business profile
    const { data: business } = await withTimeout(
      supabase
        .from('business_profiles')
        .select('company_name, logo_url, city')
        .eq('id', (collab as CollaborationRow).business_id)
        .maybeSingle(),
      10_000
    );

    return {
      ...(collab as CollaborationRow),
      experience: experience || undefined,
      creator: creator || undefined,
      business: business || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Gets all deliverables for a collaboration.
 */
export async function getCollaborationDeliverables(
  collaborationId: string
): Promise<CollaborationDeliverableRow[]> {
  const supabase = await createClient();

  try {
    const { data } = await withTimeout(
      supabase
        .from('collaboration_deliverables')
        .select('*')
        .eq('collaboration_id', collaborationId)
        .order('created_at', { ascending: true }),
      10_000
    );

    return (data as CollaborationDeliverableRow[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * Creates a new deliverable for a collaboration.
 * Only business owner of the collaboration can do this.
 */
export async function createDeliverable(
  collaborationId: string,
  input: {
    deliverable_type: DeliverableType;
    description?: string;
    due_date?: string;
  }
): Promise<CollaborationDeliverableRow | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();

  try {
    const { data, error } = await withTimeout(
      supabase
        .from('collaboration_deliverables')
        .insert({
          collaboration_id: collaborationId,
          deliverable_type: input.deliverable_type,
          description: input.description || null,
          due_date: input.due_date || null,
          status: 'pending',
        } as CollaborationDeliverableRow)
        .select()
        .single(),
      10_000
    );

    if (error || !data) return null;
    return data as CollaborationDeliverableRow;
  } catch {
    return null;
  }
}

/**
 * Gets all content submissions for a collaboration.
 */
export async function getCollaborationSubmissions(
  collaborationId: string
): Promise<
  (ContentSubmissionRow & {
    deliverable?: { deliverable_type: string; description?: string };
  })[]
> {
  const supabase = await createClient();

  try {
    const { data } = await withTimeout(
      supabase
        .from('content_submissions')
        .select('*')
        .eq('collaboration_id', collaborationId)
        .order('submitted_at', { ascending: false }),
      10_000
    );

    if (!data) return [];

    // Enrich with deliverable info
    const enriched = await Promise.all(
      (data as ContentSubmissionRow[]).map(async (sub) => {
        try {
          const { data: deliv } = await withTimeout(
            supabase
              .from('collaboration_deliverables')
              .select('deliverable_type, description')
              .eq('id', sub.deliverable_id)
              .maybeSingle(),
            10_000
          );

          return {
            ...sub,
            deliverable: deliv || undefined,
          };
        } catch {
          return sub;
        }
      })
    );

    return enriched;
  } catch {
    return [];
  }
}

/**
 * Creates a content submission (Creator uploads proof of delivery).
 */
export async function createContentSubmission(
  collaborationId: string,
  deliverableId: string,
  input: {
    content_url: string;
    platform: PlatformType;
    caption?: string;
  }
): Promise<ContentSubmissionRow | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();

  try {
    // Get collaboration to ensure it exists and get business_id
    const { data: collab } = await withTimeout(
      supabase
        .from('collaborations')
        .select('creator_id, business_id')
        .eq('id', collaborationId)
        .maybeSingle(),
      10_000
    );

    if (!collab || collab.creator_id !== user.id) return null;

    const { data, error } = await withTimeout(
      supabase
        .from('content_submissions')
        .insert({
          collaboration_id: collaborationId,
          deliverable_id: deliverableId,
          creator_id: user.id,
          business_id: collab.business_id,
          content_url: input.content_url,
          platform: input.platform,
          caption: input.caption || null,
          status: 'pending_review',
        } as ContentSubmissionRow)
        .select()
        .single(),
      10_000
    );

    if (error || !data) return null;
    return data as ContentSubmissionRow;
  } catch {
    return null;
  }
}

/**
 * Updates submission status (Business approves/rejects).
 */
export async function updateSubmissionStatus(
  submissionId: string,
  status: SubmissionStatus,
  reviewNotes?: string
): Promise<{ success?: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: 'Non autenticato' };

  const supabase = await createClient();

  try {
    const { error } = await withTimeout(
      supabase
        .from('content_submissions')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq('id', submissionId)
        .eq('business_id', user.id),
      10_000
    );

    if (error) return { error: toUserMessage(error) };
    return { success: true };
  } catch (err) {
    return { error: toUserMessage(err) };
  }
}

/**
 * Updates collaboration status (mark as completed, cancelled, etc).
 */
/**
 * Updates a collaboration's status on behalf of the owning BUSINESS.
 *
 * Scoped with .eq('business_id', user.id) rather than "either participant":
 * the RLS policy collaborations_update_participant deliberately allows both
 * sides to move the status (see 004_rls_policies.sql — a finer state machine
 * is a documented MVP limitation), but completion is the Business's decision.
 * Completing is what fires fn_on_collaboration_completed, which increments the
 * Creator's protected completed_collaborations_count and unlocks reviews, so
 * letting the Creator drive it from the app would let them inflate their own
 * counter. This filter is the application-level half of that restriction.
 *
 * NOTE: the previous implementation filtered with
 * `.in('creator_id, business_id', [user.id])`, which is not valid PostgREST —
 * that string is not a column name, so every call errored out. The function
 * was unreferenced, so the breakage was never observed.
 */
export async function updateCollaborationStatus(
  collaborationId: string,
  status: CollaborationStatus
): Promise<{ success?: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: 'Non autenticato' };

  const supabase = await createClient();

  try {
    const { error } = await withTimeout(
      supabase
        .from('collaborations')
        .update({ status })
        .eq('id', collaborationId)
        .eq('business_id', user.id),
      10_000
    );

    if (error) return { error: toUserMessage(error, 'updateCollaborationStatus') };
    return { success: true };
  } catch (err) {
    return { error: toUserMessage(err, 'updateCollaborationStatus') };
  }
}

/**
 * Checks if a collaboration can be marked as completed.
 * Requirements:
 * - At least one deliverable exists
 * - All deliverables are in 'approved' state
 */
export async function canCompleteCollaboration(
  collaborationId: string
): Promise<{ canComplete: boolean; reason?: string }> {
  const supabase = await createClient();

  try {
    const { data: deliverables } = await withTimeout(
      supabase
        .from('collaboration_deliverables')
        .select('status')
        .eq('collaboration_id', collaborationId),
      10_000
    );

    if (!deliverables || deliverables.length === 0) {
      return { canComplete: false, reason: 'Nessun deliverable definito' };
    }

    const allApproved = deliverables.every(
      (d) => (d as { status: string }).status === 'approved'
    );

    if (!allApproved) {
      return {
        canComplete: false,
        reason: 'Non tutti i deliverable sono approvati',
      };
    }

    return { canComplete: true };
  } catch {
    return { canComplete: false, reason: 'Errore nella verifica' };
  }
}

/**
 * Determines the next action for a collaboration based on status.
 * Pure presentation logic based on DB state.
 */
export async function getCollaborationNextAction(
  collaborationId: string,
  userRole: 'creator' | 'business'
): Promise<{
  action: string;
  description: string;
  cta?: string;
  priority: 'high' | 'normal' | 'low';
}> {
  const supabase = await createClient();

  try {
    const { data: collab } = await withTimeout(
      supabase
        .from('collaborations')
        .select('status')
        .eq('id', collaborationId)
        .maybeSingle(),
      10_000
    );

    if (!collab) {
      return {
        action: 'not_found',
        description: 'Collaborazione non trovata',
        priority: 'high',
      };
    }

    const status = (collab as { status: CollaborationStatus }).status;

    if (status === 'completed') {
      return {
        action: 'completed',
        description: 'Collaborazione completata',
        priority: 'low',
      };
    }

    if (status === 'cancelled' || status === 'disputed') {
      return {
        action: 'inactive',
        description: `Collaborazione ${status}`,
        priority: 'low',
      };
    }

    // status === 'active'
    if (userRole === 'creator') {
      const { data: deliverables } = await withTimeout(
        supabase
          .from('collaboration_deliverables')
          .select('count')
          .eq('collaboration_id', collaborationId),
        10_000
      );

      if (!deliverables || deliverables.length === 0) {
        return {
          action: 'brief_pending',
          description: 'Brief in preparazione dal Business',
          cta: 'Ricarica',
          priority: 'normal',
        };
      }

      const { data: submissions } = await withTimeout(
        supabase
          .from('content_submissions')
          .select('status')
          .eq('collaboration_id', collaborationId),
        10_000
      );

      if (!submissions || submissions.length === 0) {
        return {
          action: 'submit_content',
          description: 'Invia i tuoi contenuti',
          cta: 'Aggiungi contenuto',
          priority: 'high',
        };
      }

      const pendingSubmissions = submissions.filter(
        (s) => (s as { status: string }).status === 'pending_review'
      );

      if (pendingSubmissions.length > 0) {
        return {
          action: 'review_pending',
          description: 'I tuoi contenuti sono in revisione',
          priority: 'normal',
        };
      }

      return {
        action: 'awaiting_completion',
        description: 'In attesa della conclusione',
        priority: 'low',
      };
    }

    // userRole === 'business'
    const { data: submissions } = await withTimeout(
      supabase
        .from('content_submissions')
        .select('status')
        .eq('collaboration_id', collaborationId),
      10_000
    );

    const pendingReview = submissions?.filter(
      (s) => (s as { status: string }).status === 'pending_review'
    );

    if (pendingReview && pendingReview.length > 0) {
      return {
        action: 'review_submissions',
        description: 'Contenuti in attesa di revisione',
        cta: 'Visualizza',
        priority: 'high',
      };
    }

    const { canComplete, reason } = await canCompleteCollaboration(
      collaborationId
    );

    if (canComplete) {
      return {
        action: 'complete_collaboration',
        description: 'Tutti i contenuti sono stati approvati',
        cta: 'Completa',
        priority: 'high',
      };
    }

    return {
      action: 'awaiting_content',
      description: reason || 'In attesa dei contenuti del Creator',
      priority: 'normal',
    };
  } catch {
    return {
      action: 'error',
      description: 'Errore nel caricamento',
      priority: 'high',
    };
  }
}
