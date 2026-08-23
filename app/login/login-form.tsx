'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login, type AuthActionState } from '@/app/auth/actions';

// =============================================================================
// VAYTU — Login form
// =============================================================================
// The server action, its field names and its error contract are unchanged:
// login() already maps every Supabase failure to a written-for-users Italian
// string ('Credenziali non valide.', 'Inserisci email e password.'), so
// nothing technical can reach the browser and no new mapping is needed here.
//
// This file changes presentation and the accessibility wiring around it:
// 48px controls, visible gold focus ring, the error announced via role="alert"
// and tied to both inputs with aria-describedby + aria-invalid, and mobile
// keyboard hints (inputMode / enterKeyHint). autoComplete is left as
// email / current-password so password managers keep working.
//
// "Password dimenticata?" sits directly under the password field and points
// at the real recovery flow (/forgot-password).
// =============================================================================

const initialState: AuthActionState = {};

// Gold is the product's one accent; .vaytu-focus (globals.css) uses it for
// the keyboard focus ring, so it stays functional rather than decorative.
const FIELD_CLASS =
  'vaytu-focus min-h-12 w-full rounded-lg border border-zinc-300 bg-white px-3.5 text-[15px] text-zinc-950 transition-colors placeholder:text-zinc-400 focus-visible:border-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus-visible:border-zinc-500';

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '';
  const [state, action, pending] = useActionState(login, initialState);

  const errorId = 'login-error';

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          enterKeyHint="next"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="nome@esempio.it"
          disabled={pending}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? errorId : undefined}
          className={FIELD_CLASS}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          enterKeyHint="go"
          disabled={pending}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? errorId : undefined}
          className={FIELD_CLASS}
        />

        {/* Standalone control, not a link inside a sentence, so it needs a
            real 44px target rather than the WCAG 2.5.8 inline exemption.
            -mr-1 pulls the added padding back so it stays flush right. */}
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="vaytu-focus -mr-1 inline-flex min-h-11 items-center rounded px-1 text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Password dimenticata?
          </Link>
        </div>
      </div>

      {state.error && (
        <p
          id={errorId}
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="vaytu-focus inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {pending ? 'Accesso in corso…' : 'Accedi'}
      </button>

      <div className="h-px bg-zinc-200 dark:bg-zinc-800" role="separator" />

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Non hai ancora un account?{' '}
        <Link
          href="/signup"
          className="vaytu-focus rounded font-medium text-zinc-950 underline underline-offset-4 dark:text-zinc-50"
        >
          Registrati
        </Link>
      </p>
    </form>
  );
}
