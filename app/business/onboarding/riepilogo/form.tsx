'use client';

import { useActionState } from 'react';
import { SubmitButton, ErrorBanner } from '@/components/form-controls';
import { submitApplication, type StepActionState } from '../actions';

const initialState: StepActionState = {};

export function RiepilogoForm() {
  const [state, action] = useActionState(submitApplication, initialState);

  return (
    <form action={action} className="space-y-4">
      <ErrorBanner message={state.error} />
      <SubmitButton pendingLabel="Invio richiesta…">Invia richiesta di verifica</SubmitButton>
    </form>
  );
}
