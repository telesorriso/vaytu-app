import { guardBusinessStep, BUSINESS_STEPS, BUSINESS_STEP_LABELS } from '@/lib/onboarding/business';
import { Stepper } from '@/components/stepper';
import { RiepilogoForm } from './form';

export default async function RiepilogoStep() {
  const data = await guardBusinessStep('riepilogo');
  const { profile, businessProfile } = data;

  const rows: [string, string][] = [
    ['Nome attività', businessProfile.company_name],
    ['Categoria', businessProfile.industry ?? '—'],
    ['Indirizzo', businessProfile.address ?? '—'],
    ['Città', businessProfile.city ?? '—'],
    ['Referente', profile.full_name],
    ['Email', profile.email],
    ['Telefono', profile.phone ?? '—'],
    ['Sito', businessProfile.website_url ?? '—'],
    ['Instagram', businessProfile.instagram_handle ? `@${businessProfile.instagram_handle}` : 'Non indicato'],
  ];

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Stepper steps={BUSINESS_STEPS} labels={BUSINESS_STEP_LABELS} current="riepilogo" />
      <h1 className="mb-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">Riepilogo</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Controlla i dati prima di inviare la richiesta di verifica.
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
