import { Suspense } from 'react';
import Link from 'next/link';
import { LoginForm } from './login-form';

// =============================================================================
// VAYTU — Login
// =============================================================================
// Presentation only: the auth flow itself (server action, session handling,
// per-role redirect) is untouched and still lives in app/auth/actions.ts.
//
// Shares the landing's chrome so the two read as one product: same wordmark
// header linking home, same white/black ground, same rounded-lg + min-h-12
// control sizing, gold reserved for the focus ring.
//
// The form is width-capped rather than stretched on desktop — a 1280px-wide
// pair of inputs looks like a form builder, not a product.
// =============================================================================

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-white dark:bg-black">
      <header className="flex items-center justify-between px-5 py-4 md:px-10">
        <Link
          href="/"
          aria-label="VAYTU — torna alla home"
          className="vaytu-focus inline-flex min-h-11 items-center rounded-md text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
        >
          VAYTU
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-5 pb-16 pt-8 md:items-center md:px-10 md:pb-24 md:pt-4">
        <div className="w-full max-w-[420px]">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl dark:text-zinc-50">
              Bentornato
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Accedi al tuo account VAYTU.
            </p>
          </div>

          <div className="mt-8">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
