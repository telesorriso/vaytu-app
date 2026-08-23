'use client';

import { useActionState, useState } from 'react';
import Image from 'next/image';
import { Field, TextInput, FileInput, SubmitButton, ErrorBanner } from '@/components/form-controls';
import { useAutosave, AutosaveIndicator } from '@/lib/hooks/use-autosave';
import { autosaveIdentita, submitIdentita, type StepActionState } from '../actions';

const initialState: StepActionState = {};

export function IdentitaForm({
  initialFullName,
  initialUsername,
  avatarUrl,
}: {
  initialFullName: string;
  initialUsername: string;
  avatarUrl: string | null;
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [username, setUsername] = useState(initialUsername);
  const [state, action, pending] = useActionState(submitIdentita, initialState);
  const autosaveStatus = useAutosave({ fullName, username }, autosaveIdentita);

  return (
    <form action={action} className="space-y-4">
      <Field label="Nome e cognome" htmlFor="fullName">
        <TextInput
          id="fullName"
          name="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
        />
      </Field>

      <Field label="Username VAYTU" htmlFor="username" hint="Solo lettere minuscole, numeri e underscore.">
        <TextInput
          id="username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          pattern="[a-z0-9_]+"
          required
        />
      </Field>

      <Field label="Foto profilo" htmlFor="avatar" hint={avatarUrl ? 'Già caricata — scegli un file solo per sostituirla.' : undefined}>
        {avatarUrl && (
          <Image
            src={avatarUrl}
            alt="Foto profilo attuale"
            width={64}
            height={64}
            className="mb-2 h-16 w-16 rounded-full object-cover"
            unoptimized
          />
        )}
        <FileInput id="avatar" name="avatar" accept="image/*" required={!avatarUrl} />
      </Field>

      <AutosaveIndicator status={autosaveStatus} />
      <ErrorBanner message={state.error} />

      <SubmitButton pendingLabel={pending ? 'Continuo…' : undefined}>Avanti</SubmitButton>
    </form>
  );
}
