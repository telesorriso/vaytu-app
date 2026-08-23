import { guardBusinessStep, BUSINESS_STEPS, BUSINESS_STEP_LABELS } from '@/lib/onboarding/business';
import { Stepper } from '@/components/stepper';
import { IdentitaForm } from './form';

export default async function IdentitaStep() {
  const data = await guardBusinessStep('identita');

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Stepper steps={BUSINESS_STEPS} labels={BUSINESS_STEP_LABELS} current="identita" />
      <h1 className="mb-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">La tua attività</h1>
      <p className="mb-6 text-sm text-zinc-500">Nome, categoria e logo.</p>
      <IdentitaForm
        initialCompanyName={data.businessProfile.company_name}
        initialIndustry={data.businessProfile.industry ?? ''}
        logoUrl={data.businessProfile.logo_url}
      />
    </div>
  );
}
