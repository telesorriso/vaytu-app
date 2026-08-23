'use client';

import { useActionState, useState } from 'react';
import { Field, TextInput, SubmitButton, ErrorBanner } from '@/components/form-controls';
import { useAutosave, AutosaveIndicator } from '@/lib/hooks/use-autosave';
import { autosaveLocalita, submitLocalita, type StepActionState } from '../actions';

const initialState: StepActionState = {};

const NICHES = [
  'Travel', 'Food', 'Fashion', 'Beauty', 'Fitness', 'Lifestyle',
  'Tech', 'Gaming', 'Parenting', 'Home & Design', 'Arte', 'Musica',
];

export function LocalitaForm({
  initialCity,
  initialNiches,
}: {
  initialCity: string;
  initialNiches: string[];
}) {
  const [city, setCity] = useState(initialCity);
  const [niches, setNiches] = useState<string[]>(initialNiches);
  const [state, action] = useActionState(submitLocalita, initialState);
  const autosaveStatus = useAutosave({ city, niches }, autosaveLocalita);

  function toggleNiche(n: string) {
    setNiches((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  return (
    <form action={action} className="space-y-4">
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

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Categorie (almeno una)
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {NICHES.map((n) => (
            <label key={n} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="niches"
                value={n}
                checked={niches.includes(n)}
                onChange={() => toggleNiche(n)}
              />
              {n}
            </label>
          ))}
        </div>
      </fieldset>

      <AutosaveIndicator status={autosaveStatus} />
      <ErrorBanner message={state.error} />

      <SubmitButton>Avanti</SubmitButton>
    </form>
  );
}
