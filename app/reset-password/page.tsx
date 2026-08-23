import Link from 'next/link';
import { getAuthUser } from '@/lib/auth/dal';
import { ResetPasswordForm } from './reset-password-form';

// =============================================================================
// VAYTU — Choose a new password
// =============================================================================
// Reached from /auth/callback once the recovery code has been exchanged for a
// session. Gated on that session existing: a visitor who lands here without
// one sees the expired/invalid state rather than a form that cannot work.
// The server action re-checks independently — a page render is not a control.
//
// getAuthUser() is withTimeout-bounded and returns null on failure, so this
// page still renders (as the invalid state) if Supabase is unreachable.
// =============================================================================

interface ResetPasswordPageProps {
  searchParams: Promise<{ state?: string }>;
}

function Shell({ children }: { children: React.ReactNode }) {
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
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}

function InvalidLink() {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl dark:text-zinc-50">
          Link non valido
        </h1>
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Il link non è valido o è scaduto. Richiedine uno nuovo per reimpostare la password.
        </p>
      </div>
      <Link
        href="/forgot-password"
        className="vaytu-focus inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        Richiedi un nuovo link
      </Link>
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/login"
          className="vaytu-focus rounded font-medium text-zinc-950 underline underline-offset-4 dark:text-zinc-50"
        >
          Torna al login
        </Link>
      </p>
    </div>
  );
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { state } = await searchParams;

  // /auth/callback redirects here with ?state=invalid when the code could not
  // be exchanged (expired, already used, tampered with).
  if (state === 'invalid') {
    return (
      <Shell>
        <InvalidLink />
      </Shell>
    );
  }

  const user = await getAuthUser();
  if (!user) {
    return (
      <Shell>
        <InvalidLink />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl dark:text-zinc-50">
          Crea una nuova password
        </h1>
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Scegli una nuova password per il tuo account VAYTU.
        </p>
      </div>
      <div className="mt-8">
        <ResetPasswordForm />
      </div>
    </Shell>
  );
}
