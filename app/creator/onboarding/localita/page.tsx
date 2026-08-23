import { guardCreatorStep, CREATOR_STEPS, CREATOR_STEP_LABELS } from '@/lib/onboarding/creator';
import { Stepper } from '@/components/stepper';
import { LocalitaForm } from './form';

export default async function LocalitaStep() {
  const data = await guardCreatorStep('localita');

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Stepper steps={CREATOR_STEPS} labels={CREATOR_STEP_LABELS} current="localita" />
      <h1 className="mb-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">Dove sei e cosa racconti</h1>
      <p className="mb-6 text-sm text-zinc-500">Città e categorie di contenuto.</p>
      <LocalitaForm initialCity={data.creatorProfile.city ?? ''} initialNiches={data.creatorProfile.niches} />
    </div>
  );
}
