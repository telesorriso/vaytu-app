import Link from 'next/link';
import { requireRole } from '@/lib/auth/dal';
import { getExperienceDetail } from '@/lib/experiences/data';
import { getExperienceReport } from '@/lib/business/data';

// =============================================================================
// VAYTU — Experience report (FASE 8)
// =============================================================================
// Counts and real content links for ONE experience. getExperienceDetail and
// getExperienceReport are both scoped to the authenticated business, so an
// experience belonging to another Business renders the not-found state rather
// than leaking its numbers.
// =============================================================================

const EXPERIENCE_STATUS_LABELS: Record<string, string> = {
  draft: 'Bozza',
  published: 'Pubblicata',
  paused: 'In pausa',
  closed: 'Chiusa',
  archived: 'Archiviata',
};

interface ExperienceReportPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExperienceReportPage({ params }: ExperienceReportPageProps) {
  await requireRole('business');
  const { id } = await params;

  const experience = await getExperienceDetail(id);

  if (!experience) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 text-center">
        <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Experience non trovata
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Questa Experience non esiste o non appartiene al tuo account.
        </p>
        <Link
          href="/business/experiences"
          className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          ← Torna alle Experiences
        </Link>
      </div>
    );
  }

  const report = await getExperienceReport(id);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <Link
        href={`/business/experiences/${id}`}
        className="inline-block text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        ← Torna all&apos;Experience
      </Link>

      {/* Header */}
      <div>
        <h1 className="break-words text-2xl font-bold text-zinc-950 md:text-3xl dark:text-zinc-50">
          {experience.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="inline-flex rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {EXPERIENCE_STATUS_LABELS[experience.status] ?? experience.status}
          </span>
          <span>
            Creata il {new Date(experience.created_at).toLocaleDateString('it-IT')}
          </span>
          {experience.application_deadline && (
            <span>
              · Candidature entro il{' '}
              {new Date(experience.application_deadline).toLocaleDateString('it-IT')}
            </span>
          )}
        </div>
      </div>

      {/* Applications */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Candidature</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <div>
            <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
              {report.applicationsReceived}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Ricevute</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
              {report.applicationsPending}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Da valutare</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
              {report.applicationsAccepted}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Accettate</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
              {report.applicationsRejected}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Rifiutate</div>
          </div>
        </div>
      </section>

      {/* Creators + collaborations */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Collaborazioni</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
              {report.activeCollaborations}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Attive</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
              {report.completedCollaborations}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Completate</div>
          </div>
        </div>

        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <p className="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400">
            Creator accettati ({report.acceptedCreators.length})
          </p>
          {report.acceptedCreators.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Nessun Creator accettato per questa Experience.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1">
              {report.acceptedCreators.map((name, i) => (
                <span
                  key={`${name}-${i}`}
                  className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Contenuti approvati ({report.approvedContent.length})
        </h2>
        {report.totalContent > report.approvedContent.length && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            {report.totalContent} contenuti ricevuti in totale, inclusi quelli non ancora
            approvati.
          </p>
        )}

        {report.approvedContent.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Nessun contenuto approvato per questa Experience.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {report.approvedContent.map((content) => (
              <div
                key={content.id}
                className="rounded-md border border-zinc-200 p-3 dark:border-zinc-700"
              >
                <a
                  href={content.content_url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  {content.content_url}
                </a>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {content.creatorName ? `${content.creatorName} · ` : ''}
                  {content.platform} ·{' '}
                  {new Date(content.submitted_at).toLocaleDateString('it-IT')}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
