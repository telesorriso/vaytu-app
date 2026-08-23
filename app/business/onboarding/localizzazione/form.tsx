'use client';

import { useActionState, useState } from 'react';
import { Field, TextInput, SubmitButton, ErrorBanner } from '@/components/form-controls';
import { useAutosave, AutosaveIndicator } from '@/lib/hooks/use-autosave';
import { autosaveLocalizzazione, submitLocalizzazione, type StepActionState } from '../actions';

const initialState: StepActionState = {};

export function LocalizzazioneForm({
  initialAddress,
  initialCity,
}: {
  initialAddress: string;
  initialCity: string;
}) {
  const [address, setAddress] = useState(initialAddress);
  const [city, setCity] = useState(initialCity);
  const [state, action] = useActionState(submitLocalizzazione, initialState);
  const autosaveStatus = useAutosave({ address, city }, autosaveLocalizzazione);

  return (
    <form action={action} className="space-y-4">
      <Field label="Indirizzo" htmlFor="address">
        <TextInput
          id="address"
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          autoComplete="street-address"
        />
      </Field>

      <Field label="Città" htmlFor="city">
        <TextInput
          id="city"
          name="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
          autoComplete="address-level2"
        />
      </Field>

      <AutosaveIndicator status={autosaveStatus} />
      <ErrorBanner message={state.error} />

      <SubmitButton>Avanti</SubmitButton>
    </form>
  );
}
