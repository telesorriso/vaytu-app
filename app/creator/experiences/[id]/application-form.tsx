'use client';

import { useActionState } from 'react';
import { Field, TextInput, SubmitButton, ErrorBanner } from '@/components/form-controls';
import { submitApplication, type ApplicationActionState } from './actions';

interface ApplicationFormProps {
  experienceId: string;
}

export function ApplicationForm({ experienceId }: ApplicationFormProps) {
  const [state, formAction] = useActionState(
    async (_prev: Record<string, unknown>, formData: FormData) => {
      return submitApplication(experienceId, _prev as ApplicationActionState, formData);
    },
    {}
  );

  return (
    <form action={formAction} className="space-y-6">
      <Field label="Il tuo messaggio" htmlFor="message">
        <textarea
          id="message"
          name="message"
          placeholder="Presentati brevemente. Spiega perché sei interessato a questa esperienza e come i tuoi contenuti potrebbero essere di valore..."
          rows={6}
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900 dark:text-blue-200">
        ℹ️ Il business vedrà il tuo profilo, il tuo livello e i tuoi contenuti verificati. Questo
        messaggio aggiunge contesto alla tua candidatura.
      </div>

      <ErrorBanner message={state.error as string | undefined} />
      {state.success && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900 dark:text-green-200">
          ✓ Candidatura inviata! Riceverai una notifica quando il business avrà preso una
          decisione.
        </div>
      )}

      <div className="flex gap-4">
        <SubmitButton>Invia candidatura</SubmitButton>
        <a
          href="/creator"
          className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Annulla
        </a>
      </div>
    </form>
  );
}
