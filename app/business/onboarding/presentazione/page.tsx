import { guardBusinessStep, BUSINESS_STEPS, BUSINESS_STEP_LABELS } from '@/lib/onboarding/business';
import { Stepper } from '@/components/stepper';
import { PresentazioneForm } from './form';

export default async function PresentazioneStep() {
  const data = await guardBusinessStep('presentazione');

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Stepper steps={BUSINESS_STEPS} labels={BUSINESS_STEP_LABELS} current="presentazione" />
      <h1 className="mb-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">Presentati ai Creator</h1>
      <p className="mb-6 text-sm text-zinc-500">Descrizione e immagine di copertina.</p>
      <PresentazioneForm
        initialDescription={data.businessProfile.description ?? ''}
        coverUrl={data.businessProfile.cover_image_url}
      />
    </div>
  );
}
