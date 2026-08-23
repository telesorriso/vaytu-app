'use client';

import { useActionState, useState } from 'react';
import Image from 'next/image';
import { Field, TextInput, FileInput, SubmitButton, ErrorBanner } from '@/components/form-controls';
import { useAutosave, AutosaveIndicator } from '@/lib/hooks/use-autosave';
import { autosaveIdentita, submitIdentita, type StepActionState } from '../actions';

const initialState: StepActionState = {};

const INDUSTRIES = [
  'Hotellerie', 'Ristorazione', 'Beauty & Wellness', 'Fashion & Retail',
  'Travel & Tourism', 'Food & Beverage', 'Sport & Fitness', 'Altro',
];

export function IdentitaForm({
  initialCompanyName,
  initialIndustry,
  logoUrl,
}: {
  initialCompanyName: string;
  initialIndustry: string;
  logoUrl: string | null;
}) {
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [industry, setIndustry] = useState(initialIndustry);
  const [state, action] = useActionState(submitIdentita, initialState);
  const autosaveStatus = useAutosave({ companyName, industry }, autosaveIdentita);

  return (
    <form action={action} className="space-y-4">
      <Field label="Nome attività" htmlFor="companyName">
        <TextInput
          id="companyName"
          name="companyName"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />
      </Field>

      <Field label="Categoria" htmlFor="industry">
        <select
          id="industry"
          name="industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="" disabled>
            Seleziona…
          </option>
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Logo" htmlFor="logo" hint={logoUrl ? 'Già caricato — scegli un file solo per sostituirlo.' : undefined}>
        {logoUrl && (
          <Image
            src={logoUrl}
            alt="Logo attuale"
            width={64}
            height={64}
            className="mb-2 h-16 w-16 rounded-md object-cover"
            unoptimized
          />
        )}
        <FileInput id="logo" name="logo" accept="image/*" required={!logoUrl} />
      </Field>

      <AutosaveIndicator status={autosaveStatus} />
      <ErrorBanner message={state.error} />

      <SubmitButton>Avanti</SubmitButton>
    </form>
  );
}
