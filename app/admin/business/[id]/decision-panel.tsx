'use client';

import { useActionState, useState } from 'react';
import { Field, TextInput, SubmitButton, ErrorBanner, InfoBanner } from '@/components/form-controls';
import { approveBusiness, rejectBusiness, toggleSuspendBusiness, type AdminActionState } from '@/app/admin/actions';

const initialState: AdminActionState = {};

export function DecisionPanel({
  businessId,
  verificationId,
  verificationStatus,
  isActive,
}: {
  businessId: string;
  verificationId: string | null;
  verificationStatus: string | null;
  isActive: boolean;
}) {
  const [approveState, approveAction] = useActionState(approveBusiness, initialState);
  const [rejectState, rejectAction] = useActionState(rejectBusiness, initialState);
  const [suspendState, suspendAction] = useActionState(toggleSuspendBusiness, initialState);
  const [showReject, setShowReject] = useState(false);

  return (
    <div className="space-y-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="text-sm font-semibold">Decisione</h3>
      <p className="text-xs text-zinc-500">
        Stato attuale richiesta: <strong>{verificationStatus ?? 'nessuna'}</strong>
      </p>

      {verificationId && verificationStatus !== 'verified' && verificationStatus !== 'rejected' && (
        <div className="flex gap-2">
          <form action={approveAction}>
            <input type="hidden" name="verificationId" value={verificationId} />
            <input type="hidden" name="businessId" value={businessId} />
            <SubmitButton>Approva</SubmitButton>
          </form>
          <button
            type="button"
            onClick={() => setShowReject((v) => !v)}
            className="rounded-md border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Rifiuta
          </button>
        </div>
      )}
      <ErrorBanner message={approveState.error} />
      {approveState.success && <InfoBanner message="Business approvato." />}

      {showReject && (
        <form action={rejectAction} className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <input type="hidden" name="verificationId" value={verificationId ?? ''} />
          <input type="hidden" name="businessId" value={businessId} />
          <Field label="Motivo del rifiuto" htmlFor="reason">
            <TextInput id="reason" name="reason" required />
          </Field>
          <ErrorBanner message={rejectState.error} />
          {rejectState.success && <InfoBanner message="Richiesta rifiutata." />}
          <SubmitButton>Conferma rifiuto</SubmitButton>
        </form>
      )}

      <form action={suspendAction} className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <input type="hidden" name="businessId" value={businessId} />
        <input type="hidden" name="nextIsActive" value={(!isActive).toString()} />
        <ErrorBanner message={suspendState.error} />
        {suspendState.success && <InfoBanner message="Stato account aggiornato." />}
        <button
          type="submit"
          className="w-full rounded-md border border-amber-300 px-4 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
        >
          {isActive ? 'Sospendi account' : 'Riattiva account'}
        </button>
      </form>
    </div>
  );
}
