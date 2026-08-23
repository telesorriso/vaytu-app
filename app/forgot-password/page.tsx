import Link from 'next/link';
import { ForgotPasswordForm } from './forgot-password-form';

// =============================================================================
// VAYTU — Password recovery request page
// =============================================================================
// Same chrome as /login (wordmark header linking home, 420px cap, 48px
// controls) so the recovery detour does not feel like a different product.
// Public: no session is required to ask for a reset link.
// =============================================================================

export default function ForgotPasswordPage() {
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
              Password dimenticata?
            </h1>
            <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Inserisci l&apos;email associata al tuo account. Ti invieremo un link per scegliere
              una nuova password.
            </p>
          </div>

          <div className="mt-8">
            <ForgotPasswordForm />
          </div>
        </div>
      </main>
    </div>
  );
}
