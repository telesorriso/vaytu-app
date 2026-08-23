'use client';

import { useActionState } from 'react';
import { SubmitButton, ErrorBanner, InfoBanner } from '@/components/form-controls';
import { assignLevel, type AdminActionState } from '@/app/admin/actions';
import type { CreatorLevelRow } from '@/lib/db/types';

const initialState: AdminActionState = {};

export function LevelForm({
  creatorId,
  currentLevelId,
  levels,
}: {
  creatorId: string;
  currentLevelId: string | null;
  levels: CreatorLevelRow[];
}) {
  const [state, action] = useActionState(assignLevel, initialState);

  return (
    <form action={action} className="space-y-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <input type="hidden" name="creatorId" value={creatorId} />
      <h3 className="text-sm font-semibold">Vaytu Level</h3>
      <select
        name="levelId"
        defaultValue={currentLevelId ?? ''}
        required
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="" disabled>
          Seleziona un livello…
        </option>
        {levels.map((level) => (
          <option key={level.id} value={level.id}>
            {level.name}
          </option>
        ))}
      </select>

      <ErrorBanner message={state.error} />
      {state.success && <InfoBanner message="Livello assegnato." />}

      <SubmitButton>Assegna livello</SubmitButton>
    </form>
  );
}
