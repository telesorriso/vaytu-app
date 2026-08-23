// =============================================================================
// VAYTU — Bounded-wait guard for network calls inside Server Actions
// =============================================================================
// Neither @supabase/storage-js (`.storage....upload()`) nor postgrest-js
// (`.from(...).select()/.insert()`) apply a default request timeout, and
// `.upload()` does not even accept an AbortSignal — there is no library-level
// way to cancel a stalled request. Left unguarded, a single stalled network
// call turns into a Server Action promise that never settles, which leaves
// the client's useFormStatus() `pending` state stuck forever with no error
// ever shown (the "Carico gli screenshot..." hang).
//
// withTimeout() races the real call against a timer so the Server Action
// always settles within a bounded time — the underlying request may still be
// in flight server-side afterwards (nothing here can abort it), but the
// caller always gets back a definite result to turn into a visible,
// retry-able error instead of a silent, permanent hang.
// =============================================================================

export class ActionTimeoutError extends Error {
  constructor(message = 'Richiesta scaduta: operazione troppo lenta o servizio non raggiungibile.') {
    super(message);
    this.name = 'ActionTimeoutError';
  }
}

/** Default bound for a single network call made from a Server Action. */
export const DEFAULT_ACTION_TIMEOUT_MS = 20_000;

// Accepts PromiseLike, not just Promise: postgrest-js query builders
// (PostgrestFilterBuilder/PostgrestBuilder) are thenables returned directly
// from `.select()`/`.insert()`/etc — they implement `.then()` but not the
// full Promise interface (no `.catch()`/`.finally()`), so `Promise<T>` is too
// narrow a parameter type for them.
export async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number = DEFAULT_ACTION_TIMEOUT_MS
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ActionTimeoutError()), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
