'use client';

import { useActionState, useState } from 'react';
import Image from 'next/image';
import { Field, FileInput, SubmitButton, ErrorBanner } from '@/components/form-controls';
import { useAutosave, AutosaveIndicator } from '@/lib/hooks/use-autosave';
import { autosavePresentazione, submitPresentazione, type StepActionState } from '../actions';

const initialState: StepActionState = {};

export function PresentazioneForm({
  initialDescription,
  coverUrl,
}: {
  initialDescription: string;
  coverUrl: string | null;
}) {
  const [description, setDescription] = useState(initialDescription);
  const [state, action] = useActionState(submitPresentazione, initialState);
  const autosaveStatus = useAutosave({ description }, autosavePresentazione);

  return (
    <form action={action} className="space-y-4">
      <Field label="Descrizione" htmlFor="description">
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={5}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field
        label="Cover"
        htmlFor="cover"
        hint={coverUrl ? 'Già caricata — scegli un file solo per sostituirla.' : undefined}
      >
        {coverUrl && (
          <Image
            src={coverUrl}
            alt="Cover attuale"
            width={320}
            height={120}
            className="mb-2 h-24 w-full rounded-md object-cover"
            unoptimized
          />
        )}
        <FileInput id="cover" name="cover" accept="image/*" required={!coverUrl} />
      </Field>

      <AutosaveIndicator status={autosaveStatus} />
      <ErrorBanner message={state.error} />

      <SubmitButton pendingLabel="Carico…">Avanti</SubmitButton>
    </form>
  );
}
