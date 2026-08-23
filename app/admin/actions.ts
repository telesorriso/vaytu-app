'use server';

// =============================================================================
// VAYTU — Admin verification actions
// =============================================================================
// Every action re-verifies admin role server-side. All writes go through
// the caller's own (admin) session — never service_role — relying on the
// *_update_admin / *_all_admin RLS policies in
// /supabase/migrations/004_rls_policies.sql.
// =============================================================================
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';

export interface AdminActionState {
  error?: string;
  success?: boolean;
}

const initialErr = (message: string): AdminActionState => ({ error: message });

// -----------------------------------------------------------------------------
// Creator verification
// -----------------------------------------------------------------------------

export async function approveCreator(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireRole('admin');
  const verificationId = String(formData.get('verificationId') ?? '');
  const creatorId = String(formData.get('creatorId') ?? '');
  if (!verificationId || !creatorId) return initialErr('Dati mancanti.');

  const supabase = await createClient();
  const { error } = await supabase
    .from('creator_verifications')
    .update({ status: 'verified', reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq('id', verificationId);
  if (error) return initialErr(error.message);

  revalidatePath('/admin/creators');
  revalidatePath(`/admin/creators/${creatorId}`);
  return { success: true };
}

export async function rejectCreator(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireRole('admin');
  const verificationId = String(formData.get('verificationId') ?? '');
  const creatorId = String(formData.get('creatorId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  if (!verificationId || !creatorId) return initialErr('Dati mancanti.');
  if (!reason) return initialErr('Indica un motivo per il rifiuto.');

  const supabase = await createClient();
  const { error } = await supabase
    .from('creator_verifications')
    .update({
      status: 'rejected',
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', verificationId);
  if (error) return initialErr(error.message);

  revalidatePath('/admin/creators');
  revalidatePath(`/admin/creators/${creatorId}`);
  return { success: true };
}

export async function toggleSuspendCreator(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireRole('admin');
  const creatorId = String(formData.get('creatorId') ?? '');
  const nextIsActive = formData.get('nextIsActive') === 'true';
  if (!creatorId) return initialErr('Dati mancanti.');

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: nextIsActive })
    .eq('id', creatorId);
  if (error) return initialErr(error.message);

  revalidatePath('/admin/creators');
  revalidatePath(`/admin/creators/${creatorId}`);
  return { success: true };
}

export async function setVerifiedMetrics(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireRole('admin');
  const metricId = String(formData.get('metricId') ?? '');
  const creatorId = String(formData.get('creatorId') ?? '');
  const followersCount = formData.get('followersCount');
  const engagementRate = formData.get('engagementRate');
  const avgViews = formData.get('avgViews');
  const avgLikes = formData.get('avgLikes');
  if (!metricId) return initialErr('Nessuna metrica da verificare.');

  const supabase = await createClient();
  const { error } = await supabase
    .from('creator_metrics')
    .update({
      followers_count: followersCount ? Number(followersCount) : null,
      engagement_rate: engagementRate ? Number(engagementRate) : null,
      avg_views: avgViews ? Number(avgViews) : null,
      avg_likes: avgLikes ? Number(avgLikes) : null,
      source: 'verified',
      is_verified: true,
      verified_by: admin.id,
      verified_at: new Date().toISOString(),
    })
    .eq('id', metricId);
  if (error) return initialErr(error.message);

  revalidatePath(`/admin/creators/${creatorId}`);
  return { success: true };
}

export async function assignLevel(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireRole('admin');
  const creatorId = String(formData.get('creatorId') ?? '');
  const levelId = String(formData.get('levelId') ?? '');
  if (!creatorId || !levelId) return initialErr('Dati mancanti.');

  const supabase = await createClient();
  const { error } = await supabase
    .from('creator_profiles')
    .update({ current_level_id: levelId })
    .eq('id', creatorId);
  if (error) return initialErr(error.message);

  revalidatePath(`/admin/creators/${creatorId}`);
  return { success: true };
}

// -----------------------------------------------------------------------------
// Business verification
// -----------------------------------------------------------------------------

export async function approveBusiness(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireRole('admin');
  const verificationId = String(formData.get('verificationId') ?? '');
  const businessId = String(formData.get('businessId') ?? '');
  if (!verificationId || !businessId) return initialErr('Dati mancanti.');

  const supabase = await createClient();
  const { error } = await supabase
    .from('business_verifications')
    .update({ status: 'verified', reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq('id', verificationId);
  if (error) return initialErr(error.message);

  revalidatePath('/admin/business');
  revalidatePath(`/admin/business/${businessId}`);
  return { success: true };
}

export async function rejectBusiness(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireRole('admin');
  const verificationId = String(formData.get('verificationId') ?? '');
  const businessId = String(formData.get('businessId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  if (!verificationId || !businessId) return initialErr('Dati mancanti.');
  if (!reason) return initialErr('Indica un motivo per il rifiuto.');

  const supabase = await createClient();
  const { error } = await supabase
    .from('business_verifications')
    .update({
      status: 'rejected',
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', verificationId);
  if (error) return initialErr(error.message);

  revalidatePath('/admin/business');
  revalidatePath(`/admin/business/${businessId}`);
  return { success: true };
}

export async function toggleSuspendBusiness(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireRole('admin');
  const businessId = String(formData.get('businessId') ?? '');
  const nextIsActive = formData.get('nextIsActive') === 'true';
  if (!businessId) return initialErr('Dati mancanti.');

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: nextIsActive })
    .eq('id', businessId);
  if (error) return initialErr(error.message);

  revalidatePath('/admin/business');
  revalidatePath(`/admin/business/${businessId}`);
  return { success: true };
}
