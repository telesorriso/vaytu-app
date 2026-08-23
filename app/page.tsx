// =============================================================================
// VAYTU — Public landing ("/")
// =============================================================================
// Replaces the Application Foundation placeholder ("Fase database completata,
// nessuna Experience ancora attiva"), which was development status text
// visible to every visitor.
//
// Deliberately small: hero, how it works for each side, one closing CTA. No
// testimonials, no logo wall, no user counters, no metrics — nothing here is
// a number, because there is no honest number to show before private beta.
//
// On the auth check: this page does read the caller's profile. It is the
// redirect target the proxy sends an already-authenticated visitor to when
// they hit /login or /signup (lib/supabase/proxy.ts), so a purely static
// landing would bounce them between / and /login forever. Both getAuthUser()
// and getAuthProfile() are withTimeout(10_000)-bounded and return null on any
// failure, so if Supabase is unreachable the page still renders — as the
// anonymous version — instead of erroring or hanging the Edge function.
// =============================================================================
import Link from 'next/link';
import { getAuthProfile, dashboardPathForRole } from '@/lib/auth/dal';
import { logout } from '@/app/auth/actions';

const CREATOR_STEPS = [
  'Scopri le Experience pubblicate vicino a te',
  'Candidati a quelle giuste per il tuo profilo',
  'Collabora con il Business',
  'Crea e invia i contenuti concordati',
  'Costruisci la tua reputazione con le recensioni',
];

const BUSINESS_STEPS = [
  'Crea la tua Experience',
  'Ricevi candidature dai Creator',
  'Scegli i Creator più adatti',
  'Gestisci la collaborazione fino alla consegna',
  'Raccogli i contenuti e lascia una valutazione',
];

function StepList({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="mt-5 space-y-3">
      {steps.map((step, i) => (
        <li key={step} className="flex gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            style={{
              background: 'var(--vaytu-gold-soft)',
              color: 'var(--vaytu-gold-foreground)',
            }}
          >
            {i + 1}
          </span>
          <span className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {step}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default async function Home() {
  const profile = await getAuthProfile();

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-black">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 md:px-10">
        <span className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          VAYTU
        </span>
        {profile ? (
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Esci
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Accedi
          </Link>
        )}
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-3xl px-5 pb-16 pt-12 text-center md:px-10 md:pb-24 md:pt-20">
        <h1 className="text-[2rem] font-semibold leading-[1.15] tracking-tight text-zinc-950 md:text-5xl dark:text-zinc-50">
          Creator e attività locali,
          <br />
          <span style={{ color: 'var(--vaytu-gold)' }}>finalmente insieme.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-600 md:mt-6 md:text-lg dark:text-zinc-400">
          VAYTU mette in contatto Creator e Business attraverso Experience e
          collaborazioni reali: candidature, contenuti concordati e recensioni
          verificate da entrambe le parti.
        </p>

        {profile ? (
          <div className="mt-9 flex flex-col items-center gap-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Bentornato, <strong className="font-medium">{profile.fullName}</strong>
            </p>
            <Link
              href={dashboardPathForRole(profile.role)}
              className="inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-lg bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Vai alla mia dashboard
            </Link>
          </div>
        ) : (
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row md:mt-10">
            <Link
              href="/signup"
              className="inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-lg bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 sm:w-auto dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Registrati
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-lg border border-zinc-300 px-6 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 sm:w-auto dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Accedi
            </Link>
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-14 md:px-10 md:py-20 dark:border-zinc-900 dark:bg-zinc-950/60">
        <div className="mx-auto w-full max-w-4xl">
          <h2 className="text-center text-xl font-semibold tracking-tight text-zinc-950 md:text-2xl dark:text-zinc-50">
            Come funziona
          </h2>

          <div className="mt-9 grid gap-5 md:mt-12 md:grid-cols-2 md:gap-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                Per i Creator
              </h3>
              <StepList steps={CREATOR_STEPS} />
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                Per i Business
              </h3>
              <StepList steps={BUSINESS_STEPS} />
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA — only for visitors who are not already signed in */}
      {!profile && (
        <section className="px-5 py-14 text-center md:px-10 md:py-20">
          <div className="mx-auto w-full max-w-xl">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950 md:text-2xl dark:text-zinc-50">
              Pronto a iniziare?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Crea il tuo account come Creator o come Business e completa il
              profilo in pochi passaggi.
            </p>
            <Link
              href="/signup"
              className="mt-7 inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-lg bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Registrati
            </Link>
          </div>
        </section>
      )}

      <footer className="mt-auto border-t border-zinc-100 px-5 py-7 text-center md:px-10 dark:border-zinc-900">
        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          © {new Date().getFullYear()} VAYTU
        </p>
      </footer>
    </div>
  );
}
