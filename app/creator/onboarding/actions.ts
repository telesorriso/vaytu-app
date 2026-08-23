'use server';

// =============================================================================
// VAYTU — Creator onboarding server actions
// =============================================================================
// Every action re-verifies role server-side (requireRole) even though the
// pages that render these forms already do — actions can be invoked
// directly and must not trust that a page-level check ran first. RLS
// (see /supabase/migrations/004_rls_policies.sql) is the layer beneath
// even this: every write here can only ever touch the caller's own rows.
// =============================================================================
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';
import {
  PUBLIC_ASSETS_BUCKET,
  VERIFICATION_EVIDENCE_BUCKET,
  avatarPath,
  evidencePath,
} from '@/lib/storage/paths';
import { EVIDENCE_KINDS, type EvidenceKind } from '@/lib/db/types';
import { ActionTimeoutError, withTimeout } from '@/lib/actions/timeout';
import { toUserMessage } from '@/lib/actions/errors';

export interface StepActionState {
  error?: string;
}

// -----------------------------------------------------------------------------
// Step 1 — Identità (nome, username, foto)
// -----------------------------------------------------------------------------

async function persistIdentita(
  userId: string,
  values: { fullName: string; username: string }
): Promise<{ error?: string }> {
  const fullName = values.fullName.trim();
  const username = values.username.trim().toLowerCase();
  if (!fullName || !username) return { error: 'Nome e username sono obbligatori.' };

  const supabase = await createClient();
  const [{ error: profileError }, { error: creatorError }] = await Promise.all([
    supabase.from('profiles').update({ full_name: fullName }).eq('id', userId),
    supabase.from('creator_profiles').update({ username }).eq('id', userId),
  ]);
  if (profileError) return { error: profileError.message };
  if (creatorError) {
    return {
      error: creatorError.code === '23505' ? 'Username già in uso.' : creatorError.message,
    };
  }
  return {};
}

export async function autosaveIdentita(values: {
  fullName: string;
  username: string;
}): Promise<{ error?: string }> {
  const profile = await requireRole('creator');
  return persistIdentita(profile.id, values);
}

export async function submitIdentita(
  _prevState: StepActionState,
  formData: FormData
): Promise<StepActionState> {
  const profile = await requireRole('creator');
  const fullName = String(formData.get('fullName') ?? '');
  const username = String(formData.get('username') ?? '');
  const avatarFile = formData.get('avatar') as File | null;

  const result = await persistIdentita(profile.id, { fullName, username });
  if (result.error) return result;

  if (avatarFile && avatarFile.size > 0) {
    const supabase = await createClient();
    const path = avatarPath(profile.id, avatarFile);
    let uploadError;
    try {
      ({ error: uploadError } = await withTimeout(
        supabase.storage.from(PUBLIC_ASSETS_BUCKET).upload(path, avatarFile, { upsert: true })
      ));
    } catch (err) {
      return { error: err instanceof ActionTimeoutError ? err.message : 'Caricamento della foto non riuscito. Riprova.' };
    }
    if (uploadError) return { error: uploadError.message };

    const { data: publicUrl } = supabase.storage.from(PUBLIC_ASSETS_BUCKET).getPublicUrl(path);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl.publicUrl })
      .eq('id', profile.id);
    if (updateError) return { error: updateError.message };
  }

  redirect('/creator/onboarding/localita');
}

// -----------------------------------------------------------------------------
// Step 2 — Località e categorie (città, categorie)
// -----------------------------------------------------------------------------

async function persistLocalita(
  userId: string,
  values: { city: string; niches: string[] }
): Promise<{ error?: string }> {
  const city = values.city.trim();
  const niches = values.niches.map((n) => n.trim()).filter(Boolean);
  const supabase = await createClient();
  const { error } = await supabase
    .from('creator_profiles')
    .update({ city, niches })
    .eq('id', userId);
  return error ? { error: toUserMessage(error, 'onboarding') } : {};
}

export async function autosaveLocalita(values: {
  city: string;
  niches: string[];
}): Promise<{ error?: string }> {
  const profile = await requireRole('creator');
  return persistLocalita(profile.id, values);
}

export async function submitLocalita(
  _prevState: StepActionState,
  formData: FormData
): Promise<StepActionState> {
  const profile = await requireRole('creator');
  const city = String(formData.get('city') ?? '');
  const niches = formData.getAll('niches').map(String);

  if (!city.trim() || niches.length === 0) {
    return { error: 'Città e almeno una categoria sono obbligatorie.' };
  }

  const result = await persistLocalita(profile.id, { city, niches });
  if (result.error) return result;

  redirect('/creator/onboarding/social');
}

// -----------------------------------------------------------------------------
// Step 3 — Social (Instagram, TikTok opzionale, follower dichiarati)
// -----------------------------------------------------------------------------

async function persistSocial(
  userId: string,
  values: { instagram: string; tiktok: string; followers: string }
): Promise<{ error?: string }> {
  const instagram = values.instagram.trim().replace(/^@/, '');
  const tiktok = values.tiktok.trim().replace(/^@/, '');
  const followers = values.followers ? Number(values.followers) : null;

  if (followers !== null && (!Number.isFinite(followers) || followers < 0)) {
    return { error: 'Numero di follower non valido.' };
  }

  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from('creator_profiles')
    .update({
      instagram_handle: instagram || null,
      tiktok_handle: tiktok || null,
    })
    .eq('id', userId);
  if (profileError) return { error: profileError.message };

  if (followers !== null) {
    const { data: existing } = await supabase
      .from('creator_metrics')
      .select('id')
      .eq('creator_id', userId)
      .eq('platform', 'instagram')
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('creator_metrics')
        .update({ followers_count: followers })
        .eq('id', existing.id);
      if (error) return { error: toUserMessage(error, 'onboarding') };
    } else {
      const { error } = await supabase.from('creator_metrics').insert({
        creator_id: userId,
        platform: 'instagram',
        followers_count: followers,
        source: 'self_reported',
        is_verified: false,
      });
      if (error) return { error: toUserMessage(error, 'onboarding') };
    }
  }

  return {};
}

export async function autosaveSocial(values: {
  instagram: string;
  tiktok: string;
  followers: string;
}): Promise<{ error?: string }> {
  const profile = await requireRole('creator');
  return persistSocial(profile.id, values);
}

export async function submitSocial(
  _prevState: StepActionState,
  formData: FormData
): Promise<StepActionState> {
  const profile = await requireRole('creator');
  const instagram = String(formData.get('instagram') ?? '');
  const tiktok = String(formData.get('tiktok') ?? '');
  const followers = String(formData.get('followers') ?? '');

  if (!instagram.trim() || !followers.trim()) {
    return { error: 'Instagram e follower dichiarati sono obbligatori.' };
  }

  const result = await persistSocial(profile.id, { instagram, tiktok, followers });
  if (result.error) return result;

  redirect('/creator/onboarding/evidence');
}

// -----------------------------------------------------------------------------
// Step 4 — Evidence (4 screenshot)
// -----------------------------------------------------------------------------

export async function submitEvidence(
  _prevState: StepActionState,
  formData: FormData
): Promise<StepActionState> {
  const profile = await requireRole('creator');
  const supabase = await createClient();

  // Every network call below is wrapped in withTimeout(): neither
  // @supabase/storage-js nor postgrest-js apply a default request timeout,
  // so a single stalled call would otherwise leave this Server Action's
  // promise (and the client's "Carico gli screenshot…" pending state)
  // hanging forever with no error ever shown. A timeout here always
  // produces a definite { error } result instead.

  let metricResult;
  try {
    metricResult = await withTimeout(
      supabase
        .from('creator_metrics')
        .select('id')
        .eq('creator_id', profile.id)
        .eq('platform', 'instagram')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    );
  } catch (err) {
    return { error: err instanceof ActionTimeoutError ? err.message : 'Verifica del passo Social non riuscita. Riprova.' };
  }
  const { data: metric, error: metricError } = metricResult;

  if (metricError || !metric) {
    return { error: 'Completa prima il passo Social (Instagram e follower dichiarati).' };
  }

  let existingEvidence;
  try {
    ({ data: existingEvidence } = await withTimeout(
      supabase.from('creator_metric_evidence').select('storage_path').eq('metric_id', metric.id)
    ));
  } catch (err) {
    return { error: err instanceof ActionTimeoutError ? err.message : 'Lettura degli screenshot esistenti non riuscita. Riprova.' };
  }
  const already = new Set(
    (existingEvidence ?? [])
      .map((e) => e.storage_path.match(/\/metrics\/([a-z]+)\./)?.[1])
      .filter(Boolean)
  );

  for (const kind of EVIDENCE_KINDS as readonly EvidenceKind[]) {
    const file = formData.get(kind) as File | null;
    if (!file || file.size === 0) {
      if (!already.has(kind)) {
        return { error: 'Carica tutti e quattro gli screenshot richiesti.' };
      }
      continue;
    }

    const path = evidencePath(profile.id, kind, file);
    let uploadError;
    try {
      ({ error: uploadError } = await withTimeout(
        supabase.storage.from(VERIFICATION_EVIDENCE_BUCKET).upload(path, file, { upsert: true })
      ));
    } catch (err) {
      return {
        error:
          err instanceof ActionTimeoutError
            ? err.message
            : `Caricamento dello screenshot "${kind}" non riuscito. Riprova.`,
      };
    }
    if (uploadError) return { error: uploadError.message };

    let insertError;
    try {
      ({ error: insertError } = await withTimeout(
        supabase.from('creator_metric_evidence').insert({
          metric_id: metric.id,
          creator_id: profile.id,
          storage_path: path,
          file_type: file.type,
        })
      ));
    } catch (err) {
      return { error: err instanceof ActionTimeoutError ? err.message : 'Salvataggio dello screenshot non riuscito. Riprova.' };
    }
    if (insertError && insertError.code !== '23505') return { error: insertError.message };
  }

  redirect('/creator/onboarding/portfolio');
}

// -----------------------------------------------------------------------------
// Step 5 — Portfolio
// -----------------------------------------------------------------------------

async function persistPortfolio(
  userId: string,
  values: { portfolioUrl: string }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('creator_profiles')
    .update({ website_url: values.portfolioUrl.trim() || null })
    .eq('id', userId);
  return error ? { error: toUserMessage(error, 'onboarding') } : {};
}

export async function autosavePortfolio(values: {
  portfolioUrl: string;
}): Promise<{ error?: string }> {
  const profile = await requireRole('creator');
  return persistPortfolio(profile.id, values);
}

export async function submitPortfolio(
  _prevState: StepActionState,
  formData: FormData
): Promise<StepActionState> {
  const profile = await requireRole('creator');
  const portfolioUrl = String(formData.get('portfolioUrl') ?? '');
  if (!portfolioUrl.trim()) {
    return { error: 'Inserisci un link al tuo portfolio.' };
  }
  const result = await persistPortfolio(profile.id, { portfolioUrl });
  if (result.error) return result;

  redirect('/creator/onboarding/riepilogo');
}

// -----------------------------------------------------------------------------
// Step 6 — Riepilogo + invio candidatura
// -----------------------------------------------------------------------------

export async function submitApplication(
  _prevState: StepActionState,
  _formData: FormData
): Promise<StepActionState> {
  const profile = await requireRole('creator');
  const supabase = await createClient();

  const { error } = await supabase.from('creator_verifications').insert({
    creator_id: profile.id,
    document_type: 'creator_application',
    status: 'pending',
  });
  if (error) return { error: toUserMessage(error, 'onboarding') };

  await supabase
    .from('creator_profiles')
    .update({ onboarding_completed: true })
    .eq('id', profile.id);

  redirect('/creator/onboarding/status');
}
