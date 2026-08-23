import { guardBusinessStep, BUSINESS_STEPS, BUSINESS_STEP_LABELS } from '@/lib/onboarding/business';
import { Stepper } from '@/components/stepper';
import { LocalizzazioneForm } from './form';

export default async function LocalizzazioneStep() {
  const data = await guardBusinessStep('localizzazione');

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Stepper steps={BUSINESS_STEPS} labels={BUSINESS_STEP_LABELS} current="localizzazione" />
      <h1 className="mb-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">Dove si trova</h1>
      <p className="mb-6 text-sm text-zinc-500">Indirizzo e città dell&apos;attività.</p>
      <LocalizzazioneForm
        initialAddress={data.businessProfile.address ?? ''}
        initialCity={data.businessProfile.city ?? ''}
      />
    </div>
  );
}
