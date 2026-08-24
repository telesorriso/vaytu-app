import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth/dal';
import { withTimeout } from '@/lib/actions/timeout';
import { toUserMessage } from '@/lib/actions/errors';
import type {
  ExperienceRow,
  ExperienceImageRow,
  ExperienceSlotRow,
  ExperienceStatus,
  CompensationType,
  ApplicationRow,
  ApplicationStatus,
} from '@/lib/db/types';

/**
 * Lists all experiences for the authenticated business user.
 * Uses RLS to ensure only the business's own experiences are returned.
 */
export async function listBusinessExperiences(
  options?: { includeArchived?: boolean }
): Promise<ExperienceRow[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();

  try {
    let query = supabase
      .from('experiences')
      .select('*')
      .eq('business_id', user.id)
      .order('created_at', { ascending: false });

    // By default, exclude archived and deleted experiences
    if (!options?.includeArchived) {
      query = query.neq('status', 'archived').is('deleted_at', null);
    } else {
      query = query.is('deleted_at', null);
    }

    const { data } = await withTimeout(query, 10_000);
    return (data as ExperienceRow[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * Gets a single experience by ID, with RLS-enforced ownership check.
 * Returns null if not found or doesn't belong to the authenticated business.
 */
export async function getExperienceDetail(experienceId: string): Promise<ExperienceRow | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();

  try {
    const { data } = await withTimeout(
      supabase
        .from('experiences')
        .select('*')
        .eq('id', experienceId)
        .eq('business_id', user.id)
        .maybeSingle(),
      10_000
    );
    return (data as ExperienceRow) ?? null;
  } catch {
    return null;
  }
}

/**
 * Gets all images for an experience.
 */
export async function getExperienceImages(experienceId: string): Promise<ExperienceImageRow[]> {
  const supabase = await createClient();

  try {
    const { data } = await withTimeout(
      supabase
        .from('experience_images')
        .select('*')
        .eq('experience_id', experienceId)
        .order('sort_order', { ascending: true }),
      10_000
    );
    return (data as ExperienceImageRow[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * Gets all slots for an experience.
 */
export async function getExperienceSlots(experienceId: string): Promise<ExperienceSlotRow[]> {
  const supabase = await createClient();

  try {
    const { data } = await withTimeout(
      supabase
        .from('experience_slots')
        .select('*')
        .eq('experience_id', experienceId)
        .order('start_date', { ascending: true }),
      10_000
    );
    return (data as ExperienceSlotRow[]) ?? [];
  } catch {
    return [];
  }
}

export interface CreateExperienceInput {
  title: string;
  description: string;
  category: string | null;
  city: string | null;
  country: string | null;
  compensation_type: CompensationType;
  compensation_value: number | null;
  compensation_details: string | null;
  requirements: string | null;
  min_level_id: string | null;
  max_creators: number;
  application_deadline: string | null; // ISO 8601 timestamp
}

/**
 * Creates a new experience. The authenticated user's ID becomes the business_id
 * (RLS ensures this cannot be spoofed). New experiences are always created as
 * 'draft' status.
 */
export async function createExperience(input: CreateExperienceInput): Promise<ExperienceRow | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();

  try {
    const { data, error } = await withTimeout(
      supabase.from('experiences').insert({
        business_id: user.id,
        title: input.title,
        description: input.description,
        category: input.category,
        city: input.city,
        country: input.country,
        compensation_type: input.compensation_type,
        compensation_value: input.compensation_value,
        compensation_details: input.compensation_details,
        requirements: input.requirements,
        min_level_id: input.min_level_id,
        max_creators: input.max_creators,
        status: 'draft',
        application_deadline: input.application_deadline,
      } as ExperienceRow).select().single(),
      10_000
    );

    if (error || !data) return null;
    return data as ExperienceRow;
  } catch {
    return null;
  }
}

export interface UpdateExperienceInput {
  title?: string;
  description?: string;
  category?: string | null;
  city?: string | null;
  country?: string | null;
  compensation_type?: CompensationType;
  compensation_value?: number | null;
  compensation_details?: string | null;
  requirements?: string | null;
  min_level_id?: string | null;
  max_creators?: number;
  application_deadline?: string | null;
}

/**
 * Updates an experience's fields. Only the business that created it can update.
 * RLS ensures this automatically; we add business_id check as defense-in-depth.
 */
export async function updateExperience(
  experienceId: string,
  input: UpdateExperienceInput
): Promise<ExperienceRow | null> {
  const user = await getAuthUser();
  if (!user) return null;

  // Build update object with only provided fields
  const updates: Partial<ExperienceRow> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.category !== undefined) updates.category = input.category;
  if (input.city !== undefined) updates.city = input.city;
  if (input.country !== undefined) updates.country = input.country;
  if (input.compensation_type !== undefined) updates.compensation_type = input.compensation_type;
  if (input.compensation_value !== undefined) updates.compensation_value = input.compensation_value;
  if (input.compensation_details !== undefined) updates.compensation_details = input.compensation_details;
  if (input.requirements !== undefined) updates.requirements = input.requirements;
  if (input.min_level_id !== undefined) updates.min_level_id = input.min_level_id;
  if (input.max_creators !== undefined) updates.max_creators = input.max_creators;
  if (input.application_deadline !== undefined) updates.application_deadline = input.application_deadline;

  const supabase = await createClient();

  try {
    const { data, error } = await withTimeout(
      supabase
        .from('experiences')
        .update(updates)
        .eq('id', experienceId)
        .eq('business_id', user.id)
        .select()
        .single(),
      10_000
    );

    if (error || !data) return null;
    return data as ExperienceRow;
  } catch {
    return null;
  }
}

/**
 * Updates an experience's status. Only valid transitions are allowed by
 * business logic (e.g., draft->published, published->paused, etc.).
 * The caller is responsible for validating the transition; this function
 * just updates the status field.
 */
export async function updateExperienceStatus(
  experienceId: string,
  status: ExperienceStatus
): Promise<ExperienceRow | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();

  try {
    const { data, error } = await withTimeout(
      supabase
        .from('experiences')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', experienceId)
        .eq('business_id', user.id)
        .select()
        .single(),
      10_000
    );

    if (error || !data) return null;
    return data as ExperienceRow;
  } catch {
    return null;
  }
}

/**
 * Soft-deletes an experience by setting deleted_at.
 * A deleted experience becomes invisible in most queries.
 */
export async function deleteExperience(experienceId: string): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return false;

  const supabase = await createClient();

  try {
    const { error } = await withTimeout(
      supabase
        .from('experiences')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', experienceId)
        .eq('business_id', user.id),
      10_000
    );

    return !error;
  } catch {
    return false;
  }
}

/**
 * Gets all published (visible) experiences for a creator to discover.
 * This function has no ownership check — it returns only status='published'
 * experiences with no deleted_at, scoped by RLS policy.
 */
export async function listPublishedExperiences(): Promise<ExperienceRow[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();

  try {
    const { data } = await withTimeout(
      supabase
        .from('experiences')
        .select('*')
        .eq('status', 'published')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      10_000
    );
    return (data as ExperienceRow[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * Gets a single published experience by ID for creator discovery.
 */
export async function getPublishedExperience(experienceId: string): Promise<ExperienceRow | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();

  try {
    const { data } = await withTimeout(
      supabase
        .from('experiences')
        .select('*')
        .eq('id', experienceId)
        .eq('status', 'published')
        .is('deleted_at', null)
        .maybeSingle(),
      10_000
    );
    return (data as ExperienceRow) ?? null;
  } catch {
    return null;
  }
}

/**
 * Lists published experiences with their business names, for creator discovery.
 * Returns experiences with businessName field populated.
 */
export async function listPublishedExperiencesWithBusinesses(): Promise<
  (ExperienceRow & { businessName: string })[]
> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();

  try {
    // First get all published experiences
    const { data: experiences } = await withTimeout(
      supabase
        .from('experiences')
        .select('*')
        .eq('status', 'published')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      10_000
    );

    if (!experiences || experiences.length === 0) return [];

    // Get unique business IDs
    const businessIds = [...new Set((experiences as ExperienceRow[]).map((e) => e.business_id))];

    // Fetch business profiles
    const { data: businesses } = await withTimeout(
      supabase.from('business_profiles').select('id, company_name').in('id', businessIds),
      10_000
    );

    const businessMap = new Map(
      (businesses ?? []).map((b: { id: string; company_name: string }) => [b.id, b.company_name])
    );

    // Combine experiences with business names
    return (experiences as ExperienceRow[])
      .map((exp) => ({
        ...exp,
        businessName: businessMap.get(exp.business_id) || 'Business',
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

/**
 * Gets all applications for a specific business.
 * Only returns applications to the authenticated business's own experiences.
 */
export async function getBusinessApplications(): Promise<ApplicationRow[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();

  try {
    const { data } = await withTimeout(
      supabase
        .from('applications')
        .select('*')
        .eq('business_id', user.id)
        .order('created_at', { ascending: false }),
      10_000
    );
    return (data as ApplicationRow[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * Lists all applications for the authenticated creator user.
 * Returns applications with experience and business profile info.
 * Uses RLS to ensure only the creator's own applications are returned.
 */
export async function getCreatorApplications(): Promise<
  (ApplicationRow & {
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
        .from('applications')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false }),
      10_000
    );

    if (!data) return [];

    // Enrich with experience and business info
    const enriched = await Promise.all(
      (data as ApplicationRow[]).map(async (app) => {
        try {
          // Get experience title
          const { data: exp } = await withTimeout(
            supabase
              .from('experiences')
              .select('title')
              .eq('id', app.experience_id)
              .maybeSingle(),
            10_000
          );

          // Get business name
          const { data: biz } = await withTimeout(
            supabase
              .from('business_profiles')
              .select('company_name')
              .eq('id', app.business_id)
              .maybeSingle(),
            10_000
          );

          return {
            ...app,
            experienceTitle: exp?.title,
            businessName: biz?.company_name,
          };
        } catch {
          return app;
        }
      })
    );

    return enriched;
  } catch {
    return [];
  }
}

/**
 * Gets a single application with creator profile info.
 */
export async function getApplicationDetail(applicationId: string): Promise<
  (ApplicationRow & {
    creatorProfile?: {
      display_name: string;
      avatar_url: string | null;
      city: string | null;
      niches: string[];
    };
  }) | null
> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();

  try {
    // Get the application
    const { data: app } = await withTimeout(
      supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .eq('business_id', user.id)
        .maybeSingle(),
      10_000
    );

    if (!app) return null;

    // Get creator profile
    const { data: creator } = await withTimeout(
      supabase
        .from('creator_profiles')
        .select('display_name, avatar_url, city, niches')
        .eq('id', (app as ApplicationRow).creator_id)
        .maybeSingle(),
      10_000
    );

    return {
      ...(app as ApplicationRow),
      creatorProfile: creator || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Creates an application (candidatura) from a creator to an experience.
 * The creator_id is taken from the authenticated user.
 * The business_id and status are set from the experience and default 'pending'.
 * Prevents duplicate applications: a creator cannot apply twice to the same experience.
 */
export async function createApplication(
  experienceId: string,
  message: string
): Promise<ApplicationRow | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();

  try {
    // getPublishedExperience, NOT getExperienceDetail: the latter filters
    // .eq('business_id', user.id), so for a Creator it always returned null
    // and no application was ever created. This is also the stricter check —
    // it confirms the experience is published and not soft-deleted before a
    // Creator may apply to it.
    const experience = await getPublishedExperience(experienceId);
    if (!experience) {
      console.error('[createApplication] experience not found or not published', {
        experienceId,
      });
      return null;
    }

    // Check for existing application from this creator to this experience
    const { data: existingApps } = await withTimeout(
      supabase
        .from('applications')
        .select('id')
        .eq('experience_id', experienceId)
        .eq('creator_id', user.id)
        .in('status', ['pending', 'accepted']),
      10_000
    );

    if (existingApps && existingApps.length > 0) {
      // Creator has already applied to this experience
      console.error('[createApplication] duplicate application', {
        experienceId,
        applicationId: existingApps[0].id,
      });
      return null;
    }

    // Create the application
    const { data, error } = await withTimeout(
      supabase
        .from('applications')
        .insert({
          experience_id: experienceId,
          slot_id: null,
          creator_id: user.id,
          business_id: experience.business_id,
          status: 'pending',
          message: message.trim(),
        } as ApplicationRow)
        .select()
        .single(),
      10_000
    );

    if (error || !data) {
      // Distinguish the real DB rejection (RLS denial, a duplicate that
      // slipped past the pre-check above via a race, a constraint, a
      // trigger error, ...) instead of collapsing every INSERT failure
      // into an indistinguishable null, same as toUserMessage() already
      // does for every other write in this codebase. The mapped message
      // is discarded here on purpose — the caller keeps its own
      // user-friendly generic copy — this call is for the safe
      // server-side log line only.
      toUserMessage(error ?? new Error('insert returned no row'), 'createApplication');
      return null;
    }
    return data as ApplicationRow;
  } catch (err) {
    toUserMessage(err, 'createApplication');
    return null;
  }
}

/**
 * Updates an application status (accept/reject).
 * Only the business that received the application can update it.
 * When status changes to 'accepted', the trigger fn_create_collaboration_on_acceptance
 * automatically creates a Collaboration record.
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
): Promise<{ success?: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: 'Non autenticato' };

  const supabase = await createClient();

  try {
    const { error } = await withTimeout(
      supabase
        .from('applications')
        .update({
          status,
          decided_at: new Date().toISOString(),
          decided_by: user.id,
        })
        .eq('id', applicationId)
        .eq('business_id', user.id),
      10_000
    );

    if (error) return { error: toUserMessage(error) };
    return { success: true };
  } catch (err) {
    return { error: toUserMessage(err) };
  }
}
