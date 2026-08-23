'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { signup, type AuthActionState } from '@/app/auth/actions';

const initialState: AuthActionState = {};

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, initialState);
  const [role, setRole] = useState<'creator' | 'business'>('creator');

  if (state.info) {
    return (
      <p className="rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
        {state.info}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Sei un…
        </legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="role"
              value="creator"
              checked={role === 'creator'}
              onChange={() => setRole('creator')}
            />
            Creator
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="role"
              value="business"
              checked={role === 'business'}
              onChange={() => setRole('business')}
            />
            Business
          </label>
        </div>
      </fieldset>

      <div className="space-y-1">
        <label htmlFor="fullName" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Nome e cognome
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          autoComplete="name"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="displayName" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {role === 'creator' ? 'Nome visualizzato' : 'Ragione sociale'}
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {pending ? 'Creazione account…' : 'Registrati'}
      </button>

      <p className="text-center text-sm text-zinc-500">
        Hai già un account?{' '}
        <Link href="/login" className="font-medium underline">
          Accedi
        </Link>
      </p>
    </form>
  );
}
