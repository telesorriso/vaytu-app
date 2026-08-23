import { guardCreatorStep, CREATOR_STEPS, CREATOR_STEP_LABELS } from '@/lib/onboarding/creator';
import { Stepper } from '@/components/stepper';
import { RiepilogoForm } from './form';

export default async function RiepilogoStep() {
  const data = await guardCreatorStep('riepilogo');
  const { profile, creatorProfile, instagramMetric } = data;

  const rows: [string, string][] = [
    ['Nome', profile.full_name],
    ['Username', `@${creatorProfile.username}`],
    ['Città', creatorProfile.city ?? '—'],
    ['Categorie', creatorProfile.niches.join(', ') || '—'],
    ['Instagram', `@${creatorProfile.instagram_handle}`],
    ['TikTok', creatorProfile.tiktok_handle ? `@${creatorProfile.tiktok_handle}` : 'Non indicato'],
    ['Follower dichiarati', instagramMetric?.followers_count?.toLocaleString('it-IT') ?? '—'],
    ['Screenshot caricati', `${data.evidenceKinds.size}/4`],
    ['Portfolio', creatorProfile.website_url ?? '—'],
  ];

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Stepper steps={CREATOR_STEPS} labels={CREATOR_STEP_LABELS} current="riepilogo" />
      <h1 className="mb-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">Riepilogo</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Controlla i dati prima di inviare la candidatura. Dopo l&apos;invio non
        potrai più modificarli finché l&apos;Admin non risponde.
      </p>

      <dl className="mb-6 divide-y divide-zinc-200 rounded-md border border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-3 py-2">
            <dt className="text-zinc-500">{label}</dt>
            <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">{value}</dd>
          </div>
        ))}
      </dl>

      <RiepilogoForm />
    </div>
  );
}
