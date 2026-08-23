import { guardBusinessStep, BUSINESS_STEPS, BUSINESS_STEP_LABELS } from '@/lib/onboarding/business';
import { Stepper } from '@/components/stepper';
import { ContattiForm } from './form';

export default async function ContattiStep() {
  const data = await guardBusinessStep('contatti');

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Stepper steps={BUSINESS_STEPS} labels={BUSINESS_STEP_LABELS} current="contatti" />
      <h1 className="mb-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">Contatti</h1>
      <p className="mb-6 text-sm text-zinc-500">Chi gestisce l&apos;account e come raggiungervi.</p>
      <ContattiForm
        initialReferente={data.profile.full_name}
        email={data.profile.email}
        initialPhone={data.profile.phone ?? ''}
        initialWebsite={data.businessProfile.website_url ?? ''}
        initialInstagram={data.businessProfile.instagram_handle ?? ''}
      />
    </div>
  );
}
