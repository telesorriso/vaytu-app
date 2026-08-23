import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth/dal';
import { withTimeout } from '@/lib/actions/timeout';

// =============================================================================
// VAYTU — Business profile / history / reporting data access
// =============================================================================
// Every figure here is COUNTED FROM THE DATABASE. Nothing is estimated,
// modelled or extrapolated: no ROI, no EMV, no reach/impression estimates, no
// revenue. RLS is the authorization boundary — each query is additionally
// scoped by business_id = auth.uid() so a Business can never read another
// Business's rows even if a policy were relaxed later.
//
// All network calls are bounded with withTimeout(10_000): Netlify Edge
// functions are killed at 10s, and postgrest-js applies no default timeout,
// so an unbounded query would surface as a blank page rather than an error.
// =============================================================================

export interface BusinessOverviewStats {
  /** Experiences currently in status='published' (excludes draft/paused/closed/archived). */
  publishedExperiences: number;
  /** All experiences the business owns, excluding archived/soft-deleted. */
  totalExperiences: number;
  /** Applications received across all of the business's experiences. */
  applicationsReceived: number;
  applicationsAccepted: number;
  applicationsRejected: number;
  applicationsPending: number;
  activeCollaborations: number;
  completedCollaborations: number;
  /** Distinct creators with at least one collaboration with this business. */
  uniqueCreators: number;
  /** Content submissions in status='approved'. */
  approvedContent: number;
  /** All content submissions received, any status. */
  totalContent: number;
  /**
   * accepted / (accepted + rejected), as a percentage. Null when no
   * application has been decided yet — a rate over an empty denominator is
   * not "0%", it is undefined, and showing 0% would be a fabricated metric.
   */
  acceptanceRate: number | null;
}

const EMPTY_STATS: BusinessOverviewStats = {
  publishedExperiences: 0,
  totalExperiences: 0,
  applicationsReceived: 0,
  applicationsAccepted: 0,
  applicationsRejected: 0,
  applicationsPending: 0,
  activeCollaborations: 0,
  completedCollaborations: 0,
  uniqueCreators: 0,
  approvedContent: 0,
  totalContent: 0,
  acceptanceRate: null,
};

/**
 * Aggregate counters for the Business dashboard (FASE 7).
 * Returns zeroed stats (never throws) when unauthenticated or on failure, so
 * the dashboard degrades to "nessun dato" instead of a crash.
 */
export async function getBusinessOverviewStats(): Promise<BusinessOverviewStats> {
  const user = await getAuthUser();
  if (!user) return EMPTY_STATS;

  const supabase = await createClient();

  try {
    const [experiences, applications, collaborations, submissions] = await Promise.all([
      withTimeout(
        supabase
          .from('experiences')
          .select('id, status')
          .eq('business_id', user.id)
          .is('deleted_at', null),
        10_000
      ),
      withTimeout(
        supabase.from('applications').select('id, status').eq('business_id', user.id),
        10_000
      ),
      withTimeout(
        supabase
          .from('collaborations')
          .select('id, status, creator_id')
          .eq('business_id', user.id),
        10_000
      ),
      withTimeout(
        supabase.from('content_submissions').select('id, status').eq('business_id', user.id),
        10_000
      ),
    ]);

    const experienceRows = (experiences.data as { status: string }[]) ?? [];
    const applicationRows = (applications.data as { status: string }[]) ?? [];
    const collaborationRows =
      (collaborations.data as { status: string; creator_id: string }[]) ?? [];
    const submissionRows = (submissions.data as { status: string }[]) ?? [];

    const accepted = applicationRows.filter((a) => a.status === 'accepted').length;
    const rejected = applicationRows.filter((a) => a.status === 'rejected').length;
    const decided = accepted + rejected;

    return {
      publishedExperiences: experienceRows.filter((e) => e.status === 'published').length,
      totalExperiences: experienceRows.filter((e) => e.status !== 'archived').length,
      applicationsReceived: applicationRows.length,
      applicationsAccepted: accepted,
      applicationsRejected: rejected,
      applicationsPending: applicationRows.filter((a) => a.status === 'pending').length,
      activeCollaborations: collaborationRows.filter((c) => c.status === 'active').length,
      completedCollaborations: collaborationRows.filter((c) => c.status === 'completed').length,
      uniqueCreators: new Set(collaborationRows.map((c) => c.creator_id)).size,
      approvedContent: submissionRows.filter((s) => s.status === 'approved').length,
      totalContent: submissionRows.length,
      acceptanceRate: decided > 0 ? Math.round((accepted / decided) * 100) : null,
    };
  } catch {
    return EMPTY_STATS;
  }
}

export interface BusinessReviewSummary {
  count: number;
  /** Mean rating rounded to one decimal. 0 when there are no reviews. */
  average: number;
  items: Array<{
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
  }>;
}

/**
 * Reviews left BY creators ABOUT this business (review_type =
 * 'creator_to_business'). RLS restricts reviews to reviewer/reviewee/admin,
 * and reviewee_id is pinned to the caller here as a second layer.
 */
export async function getBusinessReviews(limit = 10): Promise<BusinessReviewSummary> {
  const user = await getAuthUser();
  if (!user) return { count: 0, average: 0, items: [] };

  const supabase = await createClient();

  try {
    const { data } = await withTimeout(
      supabase
        .from('reviews')
        .select('id, rating, comment, created_at')
        .eq('reviewee_id', user.id)
        .eq('review_type', 'creator_to_business')
        .order('created_at', { ascending: false }),
      10_000
    );

    const rows = (data as BusinessReviewSummary['items']) ?? [];
    if (rows.length === 0) return { count: 0, average: 0, items: [] };

    const total = rows.reduce((sum, r) => sum + r.rating, 0);

    return {
      count: rows.length,
      average: Math.round((total / rows.length) * 10) / 10,
      items: rows.slice(0, limit),
    };
  } catch {
    return { count: 0, average: 0, items: [] };
  }
}

export interface BusinessCollaborationHistoryItem {
  id: string;
  status: string;
  created_at: string;
  experienceTitle: string | null;
  creatorName: string | null;
}

/**
 * Most recent collaborations for the business profile page, newest first.
 * Two flat queries + an in-memory join instead of a nested select: the
 * embedded-resource shape postgrest returns for one-to-one relations is
 * awkward to type, and these lists are small (bounded by `limit`).
 */
export async function getBusinessCollaborationHistory(
  limit = 5
): Promise<BusinessCollaborationHistoryItem[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();

  try {
    const { data } = await withTimeout(
      supabase
        .from('collaborations')
        .select('id, status, created_at, experience_id, creator_id')
        .eq('business_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit),
      10_000
    );

    const rows =
      (data as Array<{
        id: string;
        status: string;
        created_at: string;
        experience_id: string;
        creator_id: string;
      }>) ?? [];

    if (rows.length === 0) return [];

    const experienceIds = [...new Set(rows.map((r) => r.experience_id))];
    const creatorIds = [...new Set(rows.map((r) => r.creator_id))];

    const [experiences, creators] = await Promise.all([
      withTimeout(
        supabase.from('experiences').select('id, title').in('id', experienceIds),
        10_000
      ),
      withTimeout(
        supabase.from('creator_profiles').select('id, display_name').in('id', creatorIds),
        10_000
      ),
    ]);

    const titleById = new Map(
      ((experiences.data as { id: string; title: string }[]) ?? []).map((e) => [e.id, e.title])
    );
    const nameById = new Map(
      ((creators.data as { id: string; display_name: string }[]) ?? []).map((c) => [
        c.id,
        c.display_name,
      ])
    );

    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      created_at: r.created_at,
      experienceTitle: titleById.get(r.experience_id) ?? null,
      creatorName: nameById.get(r.creator_id) ?? null,
    }));
  } catch {
    return [];
  }
}

export interface ExperienceReportContent {
  id: string;
  content_url: string;
  platform: string;
  status: string;
  submitted_at: string;
  creatorName: string | null;
}

export interface ExperienceReport {
  applicationsReceived: number;
  applicationsAccepted: number;
  applicationsRejected: number;
  applicationsPending: number;
  activeCollaborations: number;
  completedCollaborations: number;
  acceptedCreators: string[];
  approvedContent: ExperienceReportContent[];
  totalContent: number;
}

const EMPTY_REPORT: ExperienceReport = {
  applicationsReceived: 0,
  applicationsAccepted: 0,
  applicationsRejected: 0,
  applicationsPending: 0,
  activeCollaborations: 0,
  completedCollaborations: 0,
  acceptedCreators: [],
  approvedContent: [],
  totalContent: 0,
};

/**
 * Per-experience report (FASE 8). Scoped by experience_id AND business_id so
 * a Business cannot report on an experience it does not own even by guessing
 * a UUID.
 */
export async function getExperienceReport(experienceId: string): Promise<ExperienceReport> {
  const user = await getAuthUser();
  if (!user) return EMPTY_REPORT;

  const supabase = await createClient();

  try {
    const [applications, collaborations] = await Promise.all([
      withTimeout(
        supabase
          .from('applications')
          .select('id, status, creator_id')
          .eq('experience_id', experienceId)
          .eq('business_id', user.id),
        10_000
      ),
      withTimeout(
        supabase
          .from('collaborations')
          .select('id, status, creator_id')
          .eq('experience_id', experienceId)
          .eq('business_id', user.id),
        10_000
      ),
    ]);

    const applicationRows =
      (applications.data as { status: string; creator_id: string }[]) ?? [];
    const collaborationRows =
      (collaborations.data as { id: string; status: string; creator_id: string }[]) ?? [];

    const collaborationIds = collaborationRows.map((c) => c.id);

    let submissionRows: Array<{
      id: string;
      content_url: string;
      platform: string;
      status: string;
      submitted_at: string;
      creator_id: string;
    }> = [];

    if (collaborationIds.length > 0) {
      const { data } = await withTimeout(
        supabase
          .from('content_submissions')
          .select('id, content_url, platform, status, submitted_at, creator_id')
          .in('collaboration_id', collaborationIds)
          .eq('business_id', user.id)
          .order('submitted_at', { ascending: false }),
        10_000
      );
      submissionRows = (data as typeof submissionRows) ?? [];
    }

    const acceptedCreatorIds = [
      ...new Set(applicationRows.filter((a) => a.status === 'accepted').map((a) => a.creator_id)),
    ];
    const submissionCreatorIds = [...new Set(submissionRows.map((s) => s.creator_id))];
    const creatorIds = [...new Set([...acceptedCreatorIds, ...submissionCreatorIds])];

    const nameById = new Map<string, string>();
    if (creatorIds.length > 0) {
      const { data } = await withTimeout(
        supabase.from('creator_profiles').select('id, display_name').in('id', creatorIds),
        10_000
      );
      for (const c of ((data as { id: string; display_name: string }[]) ?? [])) {
        nameById.set(c.id, c.display_name);
      }
    }

    return {
      applicationsReceived: applicationRows.length,
      applicationsAccepted: applicationRows.filter((a) => a.status === 'accepted').length,
      applicationsRejected: applicationRows.filter((a) => a.status === 'rejected').length,
      applicationsPending: applicationRows.filter((a) => a.status === 'pending').length,
      activeCollaborations: collaborationRows.filter((c) => c.status === 'active').length,
      completedCollaborations: collaborationRows.filter((c) => c.status === 'completed').length,
      acceptedCreators: acceptedCreatorIds.map((id) => nameById.get(id) ?? 'Creator'),
      approvedContent: submissionRows
        .filter((s) => s.status === 'approved')
        .map((s) => ({
          id: s.id,
          content_url: s.content_url,
          platform: s.platform,
          status: s.status,
          submitted_at: s.submitted_at,
          creatorName: nameById.get(s.creator_id) ?? null,
        })),
      totalContent: submissionRows.length,
    };
  } catch {
    return EMPTY_REPORT;
  }
}
