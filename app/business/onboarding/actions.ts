'use server';

// =============================================================================
// VAYTU — Business onboarding server actions
// =============================================================================
// Same defense-in-depth pattern as /app/creator/onboarding/actions.ts: every
// action re-verifies role server-side, and RLS underneath scopes every write
// to the caller's own rows regardless.
// =============================================================================
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';
import {
  PUBLIC_ASSETS_BUCKET,
  businessLogoPath,
  businessCoverPath,
} from '@/lib/storage/paths';
import { ActionTimeoutError, withTimeout } from '@/lib/actions/timeout';

export interface StepActionState {
  error?: string;
}

// -----------------------------------------------------------------------------
// Step 1 — Identità (nome attività, categoria, logo)
// -----------------------------------------------------------------------------

async function persistIdentita(
  userId: string,
  values: { companyName: string; industry: string }
): Promise<{ error?: string }> {
  const companyName = values.companyName.trim();
  const industry = values.industry.trim();
  if (!companyName || !industry) return { error: 'Nome attività e categoria sono obbligatori.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('business_profiles')
    .update({ company_name: companyName, industry })
    .eq('id', userId);
  return error ? { error: error.message } : {};
}

export async function autosaveIdentita(values: {
  companyName: string;
  industry: string;
}): Promise<{ error?: string }> {
  const profile = await requireRole('business');
  return persistIdentita(profile.id, values);
}

export async function submitIdentita(
  _prevState: StepActionState,
  formData: FormData
): Promise<StepActionState> {
  const profile = await requireRole('business');
  const companyName = String(formData.get('companyName') ?? '');
  const industry = String(formData.get('industry') ?? '');
  const logoFile = formData.get('logo') as File | null;

  const result = await persistIdentita(profile.id, { companyName, industry });
  if (result.error) return result;

  if (logoFile && logoFile.size > 0) {
    const supabase = await createClient();
    const path = businessLogoPath(profile.id, logoFile);
    let uploadError;
    try {
      ({ error: uploadError } = await withTimeout(
        supabase.storage.from(PUBLIC_ASSETS_BUCKET).upload(path, logoFile, { upsert: true })
      ));
    } catch (err) {
      return { error: err instanceof ActionTimeoutError ? err.message : 'Caricamento del logo non riuscito. Riprova.' };
    }
    if (uploadError) return { error: uploadError.message };

    const { data: publicUrl } = supabase.storage.from(PUBLIC_ASSETS_BUCKET).getPublicUrl(path);
    const { error: updateError } = await supabase
      .from('business_profiles')
      .update({ logo_url: publicUrl.publicUrl })
      .eq('id', profile.id);
    if (updateError) return { error: updateError.message };
  }

  redirect('/business/onboarding/localizzazione');
}

// -----------------------------------------------------------------------------
// Step 2 — Localizzazione (indirizzo, città)
// -----------------------------------------------------------------------------

async function persistLocalizzazione(
  userId: string,
  values: { address: string; city: string }
): Promise<{ error?: string }> {
  const address = values.address.trim();
  const city = values.city.trim();
  const supabase = await createClient();
  const { error } = await supabase
    .from('business_profiles')
    .update({ address, city })
    .eq('id', userId);
  return error ? { error: error.message } : {};
}

export async function autosaveLocalizzazione(values: {
  address: string;
  city: string;
}): Promise<{ error?: string }> {
  const profile = await requireRole('business');
  return persistLocalizzazione(profile.id, values);
}

export async function submitLocalizzazione(
  _prevState: StepActionState,
  formData: FormData
): Promise<StepActionState> {
  const profile = await requireRole('business');
  const address = String(formData.get('address') ?? '');
  const city = String(formData.get('city') ?? '');

  if (!address.trim() || !city.trim()) {
    return { error: 'Indirizzo e città sono obbligatori.' };
  }

  const result = await persistLocalizzazione(profile.id, { address, city });
  if (result.error) return result;

  redirect('/business/onboarding/contatti');
}

// -----------------------------------------------------------------------------
// Step 3 — Contatti (referente, telefono, sito, Instagram)
// -----------------------------------------------------------------------------

async function persistContatti(
  userId: string,
  values: { referente: string; phone: string; website: string; instagram: string }
): Promise<{ error?: string }> {
  const referente = values.referente.trim();
  const phone = values.phone.trim();
  const website = values.website.trim();
  const instagram = values.instagram.trim().replace(/^@/, '');

  const supabase = await createClient();
  const [{ error: profileError }, { error: businessError }] = await Promise.all([
    supabase.from('profiles').update({ full_name: referente, phone }).eq('id', userId),
    supabase
      .from('business_profiles')
      .update({ website_url: website || null, instagram_handle: instagram || null })
      .eq('id', userId),
  ]);
  if (profileError) return { error: profileError.message };
  if (businessError) return { error: businessError.message };
  return {};
}

export async function autosaveContatti(values: {
  referente: string;
  phone: string;
  website: string;
  instagram: string;
}): Promise<{ error?: string }> {
  const profile = await requireRole('business');
  return persistContatti(profile.id, values);
}

export async function submitContatti(
  _prevState: StepActionState,
  formData: FormData
): Promise<StepActionState> {
  const profile = await requireRole('business');
  const referente = String(formData.get('referente') ?? '');
  const phone = String(formData.get('phone') ?? '');
  const website = String(formData.get('website') ?? '');
  const instagram = String(formData.get('instagram') ?? '');

  if (!referente.trim() || !phone.trim() || !website.trim()) {
    return { error: 'Referente, telefono e sito sono obbligatori.' };
  }

  const result = await persistContatti(profile.id, { referente, phone, website, instagram });
  if (result.error) return result;

  redirect('/business/onboarding/presentazione');
}

// -----------------------------------------------------------------------------
// Step 4 — Presentazione (descrizione, cover)
// -----------------------------------------------------------------------------

async function persistPresentazione(
  userId: string,
  values: { description: string }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('business_profiles')
    .update({ description: values.description.trim() })
    .eq('id', userId);
  return error ? { error: error.message } : {};
}

export async function autosavePresentazione(values: {
  description: string;
}): Promise<{ error?: string }> {
  const profile = await requireRole('business');
  return persistPresentazione(profile.id, values);
}

export async function submitPresentazione(
  _prevState: StepActionState,
  formData: FormData
): Promise<StepActionState> {
  const profile = await requireRole('business');
  const description = String(formData.get('description') ?? '');
  const coverFile = formData.get('cover') as File | null;

  if (!description.trim()) return { error: 'La descrizione è obbligatoria.' };

  const result = await persistPresentazione(profile.id, { description });
  if (result.error) return result;

  if (coverFile && coverFile.size > 0) {
    const supabase = await createClient();
    const path = businessCoverPath(profile.id, coverFile);
    let uploadError;
    try {
      ({ error: uploadError } = await withTimeout(
        supabase.storage.from(PUBLIC_ASSETS_BUCKET).upload(path, coverFile, { upsert: true })
      ));
    } catch (err) {
      return { error: err instanceof ActionTimeoutError ? err.message : 'Caricamento della copertina non riuscito. Riprova.' };
    }
    if (uploadError) return { error: uploadError.message };

    const { data: publicUrl } = supabase.storage.from(PUBLIC_ASSETS_BUCKET).getPublicUrl(path);
    const { error: updateError } = await supabase
      .from('business_profiles')
      .update({ cover_image_url: publicUrl.publicUrl })
      .eq('id', profile.id);
    if (updateError) return { error: updateError.message };
  }

  redirect('/business/onboarding/riepilogo');
}

// -----------------------------------------------------------------------------
// Step 5 — Riepilogo + invio verifica
// -----------------------------------------------------------------------------

export async function submitApplication(
  _prevState: StepActionState,
  _formData: FormData
): Promise<StepActionState> {
  const profile = await requireRole('business');
  const supabase = await createClient();

  const { error } = await supabase.from('business_verifications').insert({
    business_id: profile.id,
    document_type: 'business_application',
    status: 'pending',
  });
  if (error) return { error: error.message };

  redirect('/business/onboarding/status');
}
