import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/dal';
import { getPublishedExperience } from '@/lib/experiences/data';
import { createClient } from '@/lib/supabase/server';
import { ApplyButton } from './apply-button';

interface ExperienceDetailPageProps {
  params: { id: string };
}

export default async function ExperienceDetailPage({ params }: ExperienceDetailPageProps) {
  await requireRole('creator');

  // Load the published experience
  const experience = await getPublishedExperience(params.id);
  if (!experience) {
    redirect('/creator');
  }

  // Load business profile for more details
  const supabase = await createClient();
  const { data: businessProfile } = await supabase
    .from('business_profiles')
    .select('id, company_name, logo_url, description, website_url')
    .eq('id', experience.business_id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link href="/creator" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
          ← Torna alle opportunità
        </Link>
      </div>

      {/* Header section with title and apply button */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 space-y-2">
            <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50">
              {experience.title}
            </h1>
            {businessProfile && (
              <p className="text-lg text-zinc-600 dark:text-zinc-400">
                da <span className="font-semibold">{businessProfile.company_name}</span>
              </p>
            )}
          </div>
          <ApplyButton experienceId={experience.id} />
        </div>

        {/* Basic info */}
        <div className="flex flex-wrap gap-4">
          {experience.city && (
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <span className="text-lg">📍</span>
              <span>{experience.city}</span>
            </div>
          )}
          {experience.category && (
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <span className="text-lg">🏷️</span>
              <span>{experience.category}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              Descrizione
            </h2>
            <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
              {experience.description}
            </p>
          </div>

          {/* Compensation */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              Compenso
            </h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Tipo</div>
                <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                  {experience.compensation_type
                    .split('_')
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')}
                </div>
              </div>
              {experience.compensation_value && (
                <div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">Importo</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    €{experience.compensation_value.toFixed(2)}
                  </div>
                </div>
              )}
              {experience.compensation_details && (
                <div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">Dettagli</div>
                  <p className="text-zinc-700 dark:text-zinc-300">{experience.compensation_details}</p>
                </div>
              )}
            </div>
          </div>

          {/* Requirements */}
          {experience.requirements && (
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                Requisiti
              </h2>
              <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                {experience.requirements}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Business card */}
          {businessProfile && (
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                Chi lo organizza
              </h3>

              {businessProfile.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={businessProfile.logo_url}
                  alt={businessProfile.company_name}
                  className="mb-4 h-16 w-16 rounded-lg object-cover"
                />
              )}

              <h4 className="font-semibold text-zinc-950 dark:text-zinc-50">
                {businessProfile.company_name}
              </h4>

              {businessProfile.description && (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {businessProfile.description}
                </p>
              )}

              {businessProfile.website_url && (
                <a
                  href={businessProfile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Visita sito web ↗
                </a>
              )}
            </div>
          )}

          {/* Experience info */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              Dettagli
            </h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-zinc-600 dark:text-zinc-400">Numero massimo creator</dt>
                <dd className="font-semibold text-zinc-950 dark:text-zinc-50">
                  {experience.max_creators}
                </dd>
              </div>
              {experience.application_deadline && (
                <div>
                  <dt className="text-zinc-600 dark:text-zinc-400">Deadline candidatura</dt>
                  <dd className="font-semibold text-zinc-950 dark:text-zinc-50">
                    {new Date(experience.application_deadline).toLocaleDateString('it-IT')}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-zinc-600 dark:text-zinc-400">Pubblicata il</dt>
                <dd className="font-semibold text-zinc-950 dark:text-zinc-50">
                  {new Date(experience.created_at).toLocaleDateString('it-IT')}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
