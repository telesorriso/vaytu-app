'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { updatePassword, type ResetPasswordState } from './actions';

const initialState: ResetPasswordState = {};

const FIELD_CLASS =
  'vaytu-focus min-h-12 w-full rounded-lg border border-zinc-300 bg-white px-3.5 text-[15px] text-zinc-950 transition-colors placeholder:text-zinc-400 focus-visible:border-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus-visible:border-zinc-500';

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialState);

  // Success is a full state change, not a toast: the user needs to understand
  // the password actually changed. No auto-redirect — the recovery session was
  // ended server-side, so the CTA is a real login with the new password.
  if (state.updated) {
    return (
      <div className="space-y-5">
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-3 text-sm leading-relaxed text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
        >
          Password aggiornata. Ora puoi accedere con la nuova password.
        </p>
        <Link
          href="/login"
          className="vaytu-focus inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Accedi
        </Link>
      </div>
    );
  }

  // The session died between page render and submit (expired, or the link was
  // already used). Send them back for a fresh link rather than looping.
  if (state.invalidSession) {
    return (
      <div className="space-y-5">
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-relaxed text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          Il link non è valido o è scaduto.
        </p>
        <Link
          href="/forgot-password"
          className="vaytu-focus inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Richiedi un nuovo link
        </Link>
      </div>
    );
  }

  const errorId = 'reset-password-error';

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Nuova password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          enterKeyHint="next"
          disabled={pending}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? errorId : undefined}
          className={FIELD_CLASS}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Conferma nuova password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          enterKeyHint="go"
          disabled={pending}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? errorId : undefined}
          className={FIELD_CLASS}
        />
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
        {pending ? 'Aggiornamento…' : 'Aggiorna password'}
      </button>
    </form>
  );
}
