'use client';

import { useActionState, useState } from 'react';
import { Field, TextInput, SubmitButton, ErrorBanner } from '@/components/form-controls';
import { useAutosave, AutosaveIndicator } from '@/lib/hooks/use-autosave';
import { autosaveContatti, submitContatti, type StepActionState } from '../actions';

const initialState: StepActionState = {};

export function ContattiForm({
  initialReferente,
  email,
  initialPhone,
  initialWebsite,
  initialInstagram,
}: {
  initialReferente: string;
  email: string;
  initialPhone: string;
  initialWebsite: string;
  initialInstagram: string;
}) {
  const [referente, setReferente] = useState(initialReferente);
  const [phone, setPhone] = useState(initialPhone);
  const [website, setWebsite] = useState(initialWebsite);
  const [instagram, setInstagram] = useState(initialInstagram);
  const [state, action] = useActionState(submitContatti, initialState);
  const autosaveStatus = useAutosave({ referente, phone, website, instagram }, autosaveContatti);

  return (
    <form action={action} className="space-y-4">
      <Field label="Referente" htmlFor="referente">
        <TextInput
          id="referente"
          name="referente"
          value={referente}
          onChange={(e) => setReferente(e.target.value)}
          required
          autoComplete="name"
        />
      </Field>

      <Field label="Email" htmlFor="email" hint="L'email del tuo account, non modificabile qui.">
        <TextInput id="email" value={email} disabled />
      </Field>

      <Field label="Telefono" htmlFor="phone">
        <TextInput
          id="phone"
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          autoComplete="tel"
        />
      </Field>

      <Field label="Sito" htmlFor="website">
        <TextInput
          id="website"
          name="website"
          type="url"
          placeholder="https://…"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          required
        />
      </Field>

      <Field label="Instagram (opzionale)" htmlFor="instagram" hint="Senza @">
        <TextInput
          id="instagram"
          name="instagram"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
        />
      </Field>

      <AutosaveIndicator status={autosaveStatus} />
      <ErrorBanner message={state.error} />

      <SubmitButton>Avanti</SubmitButton>
    </form>
  );
}
