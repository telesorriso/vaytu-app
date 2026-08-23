'use client';

import { useActionState } from 'react';
import { Field, FileInput, SubmitButton, ErrorBanner } from '@/components/form-controls';
import { EVIDENCE_KINDS, EVIDENCE_KIND_LABELS, type EvidenceKind } from '@/lib/db/types';
import { submitEvidence, type StepActionState } from '../actions';

const initialState: StepActionState = {};

export function EvidenceForm({ alreadyUploaded }: { alreadyUploaded: Set<string> }) {
  const [state, action] = useActionState(submitEvidence, initialState);

  return (
    <form action={action} className="space-y-4">
      {(EVIDENCE_KINDS as readonly EvidenceKind[]).map((kind) => (
        <Field
          key={kind}
          label={EVIDENCE_KIND_LABELS[kind]}
          htmlFor={kind}
          hint={alreadyUploaded.has(kind) ? 'Già caricato — scegli un file solo per sostituirlo.' : undefined}
        >
          <FileInput id={kind} name={kind} accept="image/*" required={!alreadyUploaded.has(kind)} />
        </Field>
      ))}

      <ErrorBanner message={state.error} />

      <SubmitButton pendingLabel="Carico gli screenshot…">Avanti</SubmitButton>
    </form>
  );
}
