'use client';

import { useActionState, useState } from 'react';
import { Field, TextInput, SubmitButton, ErrorBanner } from '@/components/form-controls';
import { useAutosave, AutosaveIndicator } from '@/lib/hooks/use-autosave';
import { autosaveSocial, submitSocial, type StepActionState } from '../actions';

const initialState: StepActionState = {};

export function SocialForm({
  initialInstagram,
  initialTiktok,
  initialFollowers,
}: {
  initialInstagram: string;
  initialTiktok: string;
  initialFollowers: string;
}) {
  const [instagram, setInstagram] = useState(initialInstagram);
  const [tiktok, setTiktok] = useState(initialTiktok);
  const [followers, setFollowers] = useState(initialFollowers);
  const [state, action] = useActionState(submitSocial, initialState);
  const autosaveStatus = useAutosave({ instagram, tiktok, followers }, autosaveSocial);

  return (
    <form action={action} className="space-y-4">
      <Field label="Instagram" htmlFor="instagram" hint="Senza @">
        <TextInput
          id="instagram"
          name="instagram"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          required
        />
      </Field>

      <Field label="TikTok (opzionale)" htmlFor="tiktok" hint="Senza @">
        <TextInput
          id="tiktok"
          name="tiktok"
          value={tiktok}
          onChange={(e) => setTiktok(e.target.value)}
        />
      </Field>

      <Field label="Follower dichiarati (Instagram)" htmlFor="followers">
        <TextInput
          id="followers"
          name="followers"
          type="number"
          min={0}
          inputMode="numeric"
          value={followers}
          onChange={(e) => setFollowers(e.target.value)}
          required
        />
      </Field>

      <AutosaveIndicator status={autosaveStatus} />
      <ErrorBanner message={state.error} />

      <SubmitButton>Avanti</SubmitButton>
    </form>
  );
}
