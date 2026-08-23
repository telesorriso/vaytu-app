'use client';

import { useActionState, useState } from 'react';
import { Field, TextInput, SubmitButton, ErrorBanner } from '@/components/form-controls';
import { useAutosave, AutosaveIndicator } from '@/lib/hooks/use-autosave';
import { autosavePortfolio, submitPortfolio, type StepActionState } from '../actions';

const initialState: StepActionState = {};

export function PortfolioForm({ initialUrl }: { initialUrl: string }) {
  const [portfolioUrl, setPortfolioUrl] = useState(initialUrl);
  const [state, action] = useActionState(submitPortfolio, initialState);
  const autosaveStatus = useAutosave({ portfolioUrl }, autosavePortfolio);

  return (
    <form action={action} className="space-y-4">
      <Field label="Link portfolio" htmlFor="portfolioUrl">
        <TextInput
          id="portfolioUrl"
          name="portfolioUrl"
          type="url"
          placeholder="https://…"
          value={portfolioUrl}
          onChange={(e) => setPortfolioUrl(e.target.value)}
          required
        />
      </Field>

      <AutosaveIndicator status={autosaveStatus} />
      <ErrorBanner message={state.error} />

      <SubmitButton>Avanti</SubmitButton>
    </form>
  );
}
