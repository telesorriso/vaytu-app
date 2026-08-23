'use client';

import { useActionState } from 'react';
import { Field, TextInput, SubmitButton, ErrorBanner, InfoBanner } from '@/components/form-controls';
import { setVerifiedMetrics, type AdminActionState } from '@/app/admin/actions';
import type { CreatorMetricRow } from '@/lib/db/types';

const initialState: AdminActionState = {};

export function MetricsForm({
  creatorId,
  metric,
}: {
  creatorId: string;
  metric: CreatorMetricRow;
}) {
  const [state, action] = useActionState(setVerifiedMetrics, initialState);

  return (
    <form action={action} className="space-y-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <input type="hidden" name="metricId" value={metric.id} />
      <input type="hidden" name="creatorId" value={creatorId} />
      <h3 className="text-sm font-semibold">Metriche verificate (Instagram)</h3>
      <p className="text-xs text-zinc-500">
        Follower dichiarati dal Creator: {metric.followers_count?.toLocaleString('it-IT') ?? '—'}
        {metric.is_verified && ' — già verificato'}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Follower" htmlFor="followersCount">
          <TextInput id="followersCount" name="followersCount" type="number" min={0} defaultValue={metric.followers_count ?? ''} />
        </Field>
        <Field label="Engagement rate %" htmlFor="engagementRate">
          <TextInput id="engagementRate" name="engagementRate" type="number" step="0.01" min={0} />
        </Field>
        <Field label="Views medie" htmlFor="avgViews">
          <TextInput id="avgViews" name="avgViews" type="number" min={0} />
        </Field>
        <Field label="Like medi" htmlFor="avgLikes">
          <TextInput id="avgLikes" name="avgLikes" type="number" min={0} />
        </Field>
      </div>

      <ErrorBanner message={state.error} />
      {state.success && <InfoBanner message="Metriche salvate come verificate." />}

      <SubmitButton>Salva metriche verificate</SubmitButton>
    </form>
  );
}
