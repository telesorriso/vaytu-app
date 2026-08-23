'use server';

import { createClient } from '@/lib/supabase/server';
import { withTimeout } from '@/lib/actions/timeout';

// =============================================================================
// VAYTU — Set a new password from a recovery session
// =============================================================================
// updateUser() acts on the user identified by the session JWT and nothing
// else, so this can only ever change the password of the account the recovery
// link was issued for. There is no user id in the payload to tamper with, and
// no service_role anywhere near this path.
//
// Password rules are NOT invented here. Supabase is the authority on minimum
// length and strength (a project can raise them at any time), so this action
// checks only the two things it can know locally — that a password was given
// and that the confirmation matches — and maps Supabase's own rejection codes
// to Italian. Error codes are from
// node_modules/@supabase/auth-js/.../error-codes.d.ts.
// =============================================================================

export interface ResetPasswordState {
  error?: string;
  /** True once the password has actually been changed. */
  updated?: boolean;
  /** The recovery session is missing or no longer valid. */
  invalidSession?: boolean;
}

function messageForCode(code: string | undefined): string | null {
  switch (code) {
    case 'weak_password':
      return 'La password è troppo debole. Scegline una più lunga o meno comune.';
    case 'same_password':
      return 'La nuova password deve essere diversa da quella attuale.';
    case 'session_not_found':
    case 'session_expired':
    case 'bad_jwt':
    case 'flow_state_expired':
    case 'flow_state_not_found':
    case 'otp_expired':
      return null; // handled as an invalid-session state, not a field error
    case 'over_request_rate_limit':
      return 'Troppi tentativi. Attendi qualche minuto e riprova.';
    default:
      return null;
  }
}

const SESSION_GONE_CODES = new Set([
  'session_not_found',
  'session_expired',
  'bad_jwt',
  'flow_state_expired',
  'flow_state_not_found',
  'otp_expired',
]);

export async function updatePassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirmPassword') ?? '');

  if (!password || !confirm) {
    return { error: 'Compila entrambi i campi.' };
  }
  if (password !== confirm) {
    return { error: 'Controlla che le password coincidano.' };
  }

  const supabase = await createClient();

  // Re-check the recovery session server-side. The page already gates on this,
  // but a page render is not a control: without this, a POST from a visitor
  // with no recovery session would reach Supabase unauthenticated.
  try {
    const {
      data: { user },
    } = await withTimeout(supabase.auth.getUser(), 10_000);
    if (!user) return { invalidSession: true };
  } catch {
    return { error: 'Non siamo riusciti ad aggiornare la password. Riprova.' };
  }

  try {
    const { error } = await withTimeout(supabase.auth.updateUser({ password }), 10_000);

    if (error) {
      const code = error.code;
      console.error('[reset-password] update failed', { code, status: error.status });

      if (code && SESSION_GONE_CODES.has(code)) return { invalidSession: true };

      return { error: messageForCode(code) ?? 'Non siamo riusciti ad aggiornare la password. Riprova.' };
    }
  } catch (err) {
    // Includes ActionTimeoutError: the user gets a definite, retryable answer
    // rather than a spinner that never resolves.
    console.error('[reset-password] update threw', {
      name: err instanceof Error ? err.name : 'unknown',
    });
    return { error: 'Non siamo riusciti ad aggiornare la password. Riprova.' };
  }

  // End the recovery session deliberately. It is a real, fully-privileged
  // session; leaving it live would drop the user into a dashboard straight
  // from an email link. Signing out means the success CTA leads to a genuine
  // login, which also proves the new password works. Failure here must not
  // turn a successful password change into an error.
  try {
    await withTimeout(supabase.auth.signOut(), 10_000);
  } catch {
    console.error('[reset-password] sign-out after update failed');
  }

  return { updated: true };
}
