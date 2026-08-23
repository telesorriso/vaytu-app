import Link from 'next/link';
import { requireRole } from '@/lib/auth/dal';
import { getBusinessOnboardingData } from '@/lib/onboarding/business';
import { getBusinessOverviewStats } from '@/lib/business/data';

// =============================================================================
// VAYTU — Business Dashboard (FASE 7: basic reporting)
// =============================================================================
// Every number below is a COUNT of rows this business owns. Deliberately
// absent: ROI, EMV, estimated reach/impressions, revenue, conversions — none
// of those are tracked anywhere in the schema, so any figure would be
// invented. Acceptance rate is shown only when at least one application has
// actually been decided (see getBusinessOverviewStats).
// =============================================================================

function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">{value}</div>
      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{label}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{hint}</div>}
    </>
  );

  const className =
    'rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900';

  if (href) {
    return (
      <Link href={href} className={`${className} block transition hover:border-zinc-300 dark:hover:border-zinc-700`}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

export default async function BusinessDashboardPage() {
  await requireRole('business');

  const data = await getBusinessOnboardingData();
  const stats = await getBusinessOverviewStats();

  const hasAnyActivity =
    stats.totalExperiences > 0 || stats.applicationsReceived > 0 || stats.totalContent > 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-6 md:px-6 md:py-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-950 md:text-3xl dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Ciao, {data?.businessProfile.company_name ?? 'Business'}. Ecco il riepilogo della tua
          attività.
        </p>
      </div>

      {!hasAnyActivity ? (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Non c&apos;è ancora nulla da mostrare. Pubblica la tua prima Experience per iniziare a
            ricevere candidature.
          </p>
          <Link
            href="/business/experiences/create"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            + Nuova Experience
          </Link>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Experiences
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard
                label="Experiences pubblicate"
                value={stats.publishedExperiences}
                href="/business/experiences"
              />
              <StatCard
                label="Experiences totali"
                value={stats.totalExperiences}
                hint="Bozze, pubblicate, in pausa e chiuse"
                href="/business/experiences"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Candidature
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Ricevute"
                value={stats.applicationsReceived}
                href="/business/applications"
              />
              <StatCard label="Da valutare" value={stats.applicationsPending} />
              <StatCard label="Accettate" value={stats.applicationsAccepted} />
              <StatCard
                label="Tasso di accettazione"
                value={
                  stats.acceptanceRate === null ? 'Non disponibile' : `${stats.acceptanceRate}%`
                }
                hint={
                  stats.acceptanceRate === null
                    ? 'Nessuna candidatura ancora decisa'
                    : `${stats.applicationsAccepted} accettate su ${
                        stats.applicationsAccepted + stats.applicationsRejected
                      } decise`
                }
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Collaborazioni
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Attive"
                value={stats.activeCollaborations}
                href="/business/collaborations"
              />
              <StatCard
                label="Completate"
                value={stats.completedCollaborations}
                href="/business/collaborations"
              />
              <StatCard
                label="Creator coinvolti"
                value={stats.uniqueCreators}
                hint="Creator distinti con almeno una collaborazione"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Contenuti
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard label="Contenuti approvati" value={stats.approvedContent} />
              <StatCard
                label="Contenuti ricevuti"
                value={stats.totalContent}
                hint="Include quelli ancora in revisione"
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
