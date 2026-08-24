'use server';

// =============================================================================
// VAYTU — Auth server actions (signup / login / logout)
// =============================================================================
// Server Actions run on the server only, so credentials never round-trip
// through client JS beyond the initial form POST. Admin is never a
// selectable signup role — enforced twice: (1) the signup form has no
// admin option, (2) this action rejects any role other than
// 'creator'/'business' outright, (3) even if both were bypassed,
// profiles_insert_self's RLS policy hard-blocks role = 'admin' at the
// database layer (see /supabase/migrations/004_rls_policies.sql). Admin
// accounts are provisioned out-of-band by a project operator, never
// through this app.
// =============================================================================
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { dashboardPathForRole, type AppRole } from '@/lib/auth/dal';
import { toUserMessage } from '@/lib/actions/errors';

export interface AuthActionState {
  error?: string;
  info?: string;
}

const SIGNUP_ROLES = new Set(['creator', 'business']);

/**
 * Creates the caller's own profiles (+ creator_profiles/business_profiles)
 * row if it doesn't exist yet, from the identity data captured at signup
 * (auth user_metadata). Idempotent no-op if the row already exists.
 *
 * Needed because Supabase may require email confirmation before a session
 * exists, so the row cannot always be created inside the signup action
 * itself (RLS requires an authenticated session — `id = auth.uid()`).
 * This runs with the caller's own session either way: RLS
 * (profiles_insert_self: `role <> 'admin'`) is the real backstop even if
 * the metadata below were ever tampered with client-side.
 */
export async function ensureProfileRow(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  const metadata = user.user_metadata as {
    role?: string;
    full_name?: string;
    display_name?: string;
  };

  const role = metadata.role === 'business' ? 'business' : 'creator';
  const fullName = metadata.full_name?.trim() || user.email || 'Utente';
  const displayName = metadata.display_name?.trim() || fullName;

  // Trust the stored role over signup metadata for an account that already
  // exists — metadata is only authoritative the first time.
  const effectiveRole = (existing?.role as 'creator' | 'business' | 'admin' | undefined) ?? role;

  if (!existing) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      role,
      email: user.email ?? '',
      full_name: fullName,
    });
    if (profileError) return; // RLS or a race with another request — nothing more we can safely do here.
  }

  // Admins have no extension table.
  if (effectiveRole === 'admin') return;

  // Deliberately re-checked on EVERY call, not just when the profiles row was
  // just created. This function used to return early whenever the profiles row
  // existed, so if the extension insert had failed once (RLS hiccup, race,
  // dropped connection) it was never retried — and the account was wedged for
  // good: getCreator/BusinessOnboardingData() returns null without it, and
  // /creator <-> /creator/onboarding (likewise /business) then redirect into
  // each other forever. One such business account exists in production today.
  // Re-running the check here lets the next sign-in repair it.
  const extensionTable =
    effectiveRole === 'creator' ? 'creator_profiles' : 'business_profiles';

  const { data: extension } = await supabase
    .from(extensionTable)
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (extension) return;

  if (effectiveRole === 'creator') {
    await supabase
      .from('creator_profiles')
      .insert({ id: user.id, display_name: displayName });
  } else {
    await supabase
      .from('business_profiles')
      .insert({ id: user.id, company_name: displayName });
  }
}

export async function signup(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('fullName') ?? '').trim();
  const displayName = String(formData.get('displayName') ?? '').trim();
  const roleInput = String(formData.get('role') ?? '');

  if (!email || !password || !fullName || !displayName) {
    return { error: 'Compila tutti i campi.' };
  }
  if (!SIGNUP_ROLES.has(roleInput)) {
    return { error: 'Ruolo non valido.' };
  }
  const role = roleInput as 'creator' | 'business';

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, full_name: fullName, display_name: displayName },
    },
  });

  if (error) {
    return { error: toUserMessage(error, 'auth') };
  }

  if (!data.session) {
    // Email confirmation is required by the project's auth settings: no
    // session yet, so we cannot create the profile row now. It will be
    // created on first authenticated visit via ensureProfileRow().
    return {
      info: 'Registrazione avviata. Controlla la tua email per confermare l’account prima di accedere.',
    };
  }

  await ensureProfileRow();
  redirect(dashboardPathForRole(role));
}

export async function login(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const nextParam = String(formData.get('next') ?? '');

  if (!email || !password) {
    return { error: 'Inserisci email e password.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: 'Credenziali non valide.' };
  }

  await ensureProfileRow();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null };

  const role = (profile?.role as AppRole | undefined) ?? 'creator';
  redirect(nextParam || dashboardPathForRole(role));
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
