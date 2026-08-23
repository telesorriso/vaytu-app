import { guardCreatorStep, CREATOR_STEPS, CREATOR_STEP_LABELS } from '@/lib/onboarding/creator';
import { Stepper } from '@/components/stepper';
import { PortfolioForm } from './form';

export default async function PortfolioStep() {
  const data = await guardCreatorStep('portfolio');

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Stepper steps={CREATOR_STEPS} labels={CREATOR_STEP_LABELS} current="portfolio" />
      <h1 className="mb-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">Portfolio</h1>
      <p className="mb-6 text-sm text-zinc-500">Un link a lavori precedenti (sito, Linktree, ecc.).</p>
      <PortfolioForm initialUrl={data.creatorProfile.website_url ?? ''} />
    </div>
  );
}
