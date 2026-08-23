import { guardCreatorStep, CREATOR_STEPS, CREATOR_STEP_LABELS } from '@/lib/onboarding/creator';
import { Stepper } from '@/components/stepper';
import { EvidenceForm } from './form';

export default async function EvidenceStep() {
  const data = await guardCreatorStep('evidence');

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Stepper steps={CREATOR_STEPS} labels={CREATOR_STEP_LABELS} current="evidence" />
      <h1 className="mb-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">Prove dei tuoi numeri</h1>
      <p className="mb-6 text-sm text-zinc-500">
        4 screenshot da Instagram Insights. Visibili solo a te e all&apos;Admin
        — mai ad altri Creator o Business.
      </p>
      <EvidenceForm alreadyUploaded={data.evidenceKinds} />
    </div>
  );
}
