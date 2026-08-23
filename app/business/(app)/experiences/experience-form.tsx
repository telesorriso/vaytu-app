'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Field, TextInput, SubmitButton, ErrorBanner } from '@/components/form-controls';
import type { ExperienceRow } from '@/lib/db/types';
import type { ExperienceFormState } from './actions';

const COMPENSATION_TYPES = [
  { value: 'free_stay', label: 'Soggiorno gratuito' },
  { value: 'free_product', label: 'Prodotto gratuito' },
  { value: 'paid', label: 'Compenso in denaro' },
  { value: 'paid_plus_product', label: 'Compenso + prodotto' },
  { value: 'other', label: 'Altro' },
];

const CATEGORIES = [
  'Hotellerie',
  'Ristorazione',
  'Beauty & Wellness',
  'Fashion & Retail',
  'Travel & Tourism',
  'Food & Beverage',
  'Sport & Fitness',
  'Altro',
];

interface ExperienceFormProps {
  initialData?: ExperienceRow;
  action: (prevState: ExperienceFormState, formData: FormData) => Promise<ExperienceFormState>;
}

export function ExperienceForm({ initialData, action }: ExperienceFormProps) {
  const initialState: ExperienceFormState = {};
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {/* Title */}
      <Field label="Titolo Experience" htmlFor="title">
        <TextInput
          id="title"
          name="title"
          defaultValue={initialData?.title || ''}
          placeholder="es. Cena privata per 6 persone"
          required
        />
      </Field>

      {/* Description */}
      <Field label="Descrizione dettagliata" htmlFor="description">
        <textarea
          id="description"
          name="description"
          defaultValue={initialData?.description || ''}
          placeholder="Descrivi l'esperienza, cosa faranno i Creator, cosa dovrebbero portare, ecc."
          rows={6}
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      {/* Location */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Città" htmlFor="city">
          <TextInput
            id="city"
            name="city"
            defaultValue={initialData?.city || ''}
            placeholder="es. Roma"
          />
        </Field>
        <Field label="Paese" htmlFor="country">
          <TextInput
            id="country"
            name="country"
            defaultValue={initialData?.country || ''}
            placeholder="es. Italia"
          />
        </Field>
      </div>

      {/* Category */}
      <Field label="Categoria" htmlFor="category">
        <select
          id="category"
          name="category"
          defaultValue={initialData?.category || ''}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">Seleziona una categoria…</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </Field>

      {/* Compensation */}
      <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="font-semibold text-zinc-950 dark:text-zinc-50">Compenso</h3>

        <Field label="Tipo di compenso" htmlFor="compensationType">
          <select
            id="compensationType"
            name="compensationType"
            defaultValue={initialData?.compensation_type || 'other'}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {COMPENSATION_TYPES.map((comp) => (
              <option key={comp.value} value={comp.value}>
                {comp.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Importo (se denaro)" htmlFor="compensationValue" hint="In EUR">
          <TextInput
            id="compensationValue"
            name="compensationValue"
            type="number"
            min="0"
            step="0.01"
            defaultValue={initialData?.compensation_value || ''}
            placeholder="es. 500"
          />
        </Field>

        <Field label="Dettagli aggiuntivi" htmlFor="compensationDetails">
          <textarea
            id="compensationDetails"
            name="compensationDetails"
            defaultValue={initialData?.compensation_details || ''}
            placeholder="es. Vitto e alloggio per 3 notti"
            rows={3}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </Field>
      </div>

      {/* Requirements */}
      <Field label="Requisiti per i Creator" htmlFor="requirements">
        <textarea
          id="requirements"
          name="requirements"
          defaultValue={initialData?.requirements || ''}
          placeholder="es. Minimo 10k follower, contenuti lifestyle, esperienza con travel content"
          rows={4}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      {/* Creator slots */}
      <Field label="Numero massimo di Creator" htmlFor="maxCreators">
        <TextInput
          id="maxCreators"
          name="maxCreators"
          type="number"
          min="1"
          max="100"
          defaultValue={initialData?.max_creators || '1'}
        />
      </Field>

      {/* Status message */}
      <ErrorBanner message={state.error} />
      {state.success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900 dark:text-green-200">
          ✓ Salvato con successo
        </div>
      )}

      <div className="flex gap-4">
        <SubmitButton>{initialData ? 'Salva modifiche' : 'Crea Experience'}</SubmitButton>
        <Link
          href="/business/experiences"
          className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Annulla
        </Link>
      </div>
    </form>
  );
}
