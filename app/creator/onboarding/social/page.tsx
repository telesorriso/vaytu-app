import { guardCreatorStep, CREATOR_STEPS, CREATOR_STEP_LABELS } from '@/lib/onboarding/creator';
import { Stepper } from '@/components/stepper';
import { SocialForm } from './form';

export default async function SocialStep() {
  const data = await guardCreatorStep('social');

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Stepper steps={CREATOR_STEPS} labels={CREATOR_STEP_LABELS} current="social" />
      <h1 className="mb-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">I tuoi canali</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Instagram è obbligatorio, TikTok è opzionale. I numeri qui sotto sono
        dichiarati da te — le prove le carichi al passo successivo.
      </p>
      <SocialForm
        initialInstagram={data.creatorProfile.instagram_handle ?? ''}
        initialTiktok={data.creatorProfile.tiktok_handle ?? ''}
        initialFollowers={data.instagramMetric?.followers_count?.toString() ?? ''}
      />
    </div>
  );
}
