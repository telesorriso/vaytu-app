import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/dal';
import { getPublishedExperience } from '@/lib/experiences/data';
import { ApplicationForm } from '../application-form';

interface ApplyPageProps {
  params: { id: string };
}

export default async function ApplyPage({ params }: ApplyPageProps) {
  await requireRole('creator');

  // Load the experience to show context
  const experience = await getPublishedExperience(params.id);
  if (!experience) {
    redirect('/creator');
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href={`/creator/experiences/${params.id}`}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Torna ai dettagli
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50">
          Candidati a "{experience.title}"
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Compila il modulo per candidarti. Riceverai una notifica quando il business avrà
          deciso.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <ApplicationForm experienceId={experience.id} />
      </div>
    </div>
  );
}
