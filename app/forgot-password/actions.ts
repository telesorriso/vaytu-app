'use server';

import { createClient } from '@/lib/supabase/server';
import { withTimeout } from '@/lib/actions/timeout';
import { absoluteUrl } from '@/lib/auth/redirect';

// =============================================================================
// VAYTU — Password recovery request
// =============================================================================
// Deliberately returns the SAME neutral confirmation whether or not an account
// exists for the address, and whether or not Supabase reported an error.
// Anything else turns this form into an account-enumeration oracle: submit an
// address, read the response, learn whether that person has a VAYTU account.
//
// The redirect target is built from trusted configuration (see
// lib/auth/redirect.ts) with a LITERAL path — never anything the submitter
// controls — so a crafted request cannot aim the link in a real user's inbox
// at another site.
// =============================================================================

export interface ForgotPasswordState {
  error?: string;
  sent?: boolean;
}

/** Shown for every formally valid submission, regardless of outcome. */
const NEUTRAL_CONFIRMATION = true;

// Deliberately permissive: the server is not the place to be clever about
// what a valid address looks like. It only needs to catch obvious typos
// before spending a network call.
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get('email') ?? '').trim();

  if (!email) {
    return { error: 'Inserisci la tua email.' };
  }
  if (!looksLikeEmail(email)) {
    return { error: 'Inserisci un indirizzo email valido.' };
  }

  const redirectTo = await absoluteUrl('/auth/callback?next=/reset-password');

  try {
    const supabase = await createClient();
    const { error } = await withTimeout(
      supabase.auth.resetPasswordForEmail(email, { redirectTo }),
      10_000
    );

    if (error) {
      // Logged for us, never surfaced: "user not found" here would be the
      // enumeration leak this whole function exists to prevent.
      console.error('[forgot-password] reset request failed', { status: error.status });
    }
  } catch (err) {
    // Includes ActionTimeoutError. Still answered neutrally — the user gets a
    // definite response and can retry rather than staring at a spinner.
    console.error('[forgot-password] reset request threw', {
      name: err instanceof Error ? err.name : 'unknown',
    });
  }

  return { sent: NEUTRAL_CONFIRMATION };
}
