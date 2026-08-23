// =============================================================================
// VAYTU — Public home page ("/")
// =============================================================================
// Minimal on purpose: this is the Application Foundation phase (no
// onboarding, no Experiences, no full design). Anonymous visitors see
// login/signup links; authenticated visitors see a link to their own
// dashboard, resolved server-side via the DAL — never trust a client
// guess at the user's role.
// =============================================================================
import Link from 'next/link';
import { getAuthProfile, dashboardPathForRole } from '@/lib/auth/dal';
import { logout } from '@/app/auth/actions';

export default async function Home() {
  const profile = await getAuthProfile();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        VAYTU
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Fase database completata. Application foundation in corso — nessun
        onboarding, nessuna Experience ancora attiva.
      </p>

      {profile ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-zinc-500">
            Sei autenticato come <strong>{profile.fullName}</strong> (
            {profile.role})
          </p>
          <div className="flex gap-3">
            <Link
              href={dashboardPathForRole(profile.role)}
              className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Vai alla mia dashboard
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Esci
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Accedi
          </Link>
          <Link
            href="/signup"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Registrati
          </Link>
        </div>
      )}
    </div>
  );
}
