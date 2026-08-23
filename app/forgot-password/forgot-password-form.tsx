'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { requestPasswordReset, type ForgotPasswordState } from './actions';

const initialState: ForgotPasswordState = {};

const FIELD_CLASS =
  'vaytu-focus min-h-12 w-full rounded-lg border border-zinc-300 bg-white px-3.5 text-[15px] text-zinc-950 transition-colors placeholder:text-zinc-400 focus-visible:border-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus-visible:border-zinc-500';

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);

  // The confirmation is intentionally identical whether or not the address is
  // registered — see actions.ts. Replacing the form (rather than showing the
  // message beneath it) also stops an impatient user re-submitting to try to
  // read a different answer out of it.
  if (state.sent) {
    return (
      <div className="space-y-5">
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-3 text-sm leading-relaxed text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
        >
          Se esiste un account associato a questa email, riceverai un link per reimpostare la
          password.
        </p>
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Il link è valido per un tempo limitato. Controlla anche la cartella spam.
        </p>
        <Link
          href="/login"
          className="vaytu-focus inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Torna al login
        </Link>
      </div>
    );
  }

  const errorId = 'forgot-password-error';

  return (
    <form action={action} className="space-y-5">
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
          enterKeyHint="send"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="nome@esempio.it"
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
        {pending ? 'Invio in corso…' : 'Invia link'}
      </button>

      <div className="h-px bg-zinc-200 dark:bg-zinc-800" role="separator" />

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/login"
          className="vaytu-focus rounded font-medium text-zinc-950 underline underline-offset-4 dark:text-zinc-50"
        >
          Torna al login
        </Link>
      </p>
    </form>
  );
}
