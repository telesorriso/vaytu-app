import { guardCreatorStep, CREATOR_STEPS, CREATOR_STEP_LABELS } from '@/lib/onboarding/creator';
import { Stepper } from '@/components/stepper';
import { IdentitaForm } from './form';

export default async function IdentitaStep() {
  const data = await guardCreatorStep('identita');

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Stepper steps={CREATOR_STEPS} labels={CREATOR_STEP_LABELS} current="identita" />
      <h1 className="mb-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">Chi sei</h1>
      <p className="mb-6 text-sm text-zinc-500">Nome, username e la tua foto profilo.</p>
      <IdentitaForm
        initialFullName={data.profile.full_name}
        initialUsername={data.creatorProfile.username ?? ''}
        avatarUrl={data.profile.avatar_url}
      />
    </div>
  );
}
