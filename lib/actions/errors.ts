import { ActionTimeoutError } from './timeout';

// =============================================================================
// VAYTU — User-facing error messages (FASE 11)
// =============================================================================
// Supabase/PostgREST errors are developer artefacts: they carry SQLSTATE
// codes, constraint names, table names and policy names ("new row violates
// row-level security policy for table \"applications\""). Rendering them in
// the UI is both unreadable for an Italian-speaking user and a needless
// disclosure of the schema and of the RLS layout.
//
// toUserMessage() maps the handful of Postgres error classes we can actually
// explain into a specific Italian sentence, and collapses everything else
// into one generic, retry-able message. The raw error is logged server-side
// so nothing is lost for debugging — it just never reaches the browser.
// =============================================================================

/** Fallback shown when we cannot say anything more specific. */
export const GENERIC_ERROR_MESSAGE =
  'Si è verificato un errore. Riprova tra qualche istante.';

interface PostgrestLikeError {
  code?: string | null;
  message?: string | null;
  details?: string | null;
}

function isPostgrestLikeError(value: unknown): value is PostgrestLikeError {
  return typeof value === 'object' && value !== null && ('code' in value || 'message' in value);
}

/**
 * Maps a Postgres SQLSTATE to an Italian sentence a user can act on.
 * Returns null when the code has no meaningful user-facing explanation.
 */
function messageForSqlState(code: string): string | null {
  switch (code) {
    // unique_violation — the row already exists (e.g. a second application to
    // the same experience, or a second review on the same collaboration).
    case '23505':
      return 'Questa operazione è già stata registrata.';
    // check_violation — a domain rule rejected the value (e.g. accepting an
    // application when the slot is already full).
    case '23514':
      return 'Operazione non consentita: alcuni dati non rispettano le regole richieste.';
    // foreign_key_violation
    case '23503':
      return 'Operazione non riuscita: alcuni dati collegati non sono più disponibili.';
    // not_null_violation
    case '23502':
      return 'Mancano alcuni dati obbligatori.';
    // insufficient_privilege — RLS or a protected-column guard refused the write.
    case '42501':
      return 'Non hai i permessi necessari per questa operazione.';
    // PostgREST: no rows returned where exactly one was expected.
    case 'PGRST116':
      return 'Elemento non trovato.';
    default:
      return null;
  }
}

/**
 * Converts any thrown value or Supabase error object into a safe Italian
 * message. Never returns raw driver text.
 *
 * @param error   the caught value or a PostgrestError-shaped object
 * @param context short label used only in the server-side log line
 */
export function toUserMessage(error: unknown, context = 'action'): string {
  // A timeout already carries a written-for-users Italian message.
  if (error instanceof ActionTimeoutError) {
    return error.message;
  }

  if (isPostgrestLikeError(error)) {
    console.error(`[${context}] database error`, {
      code: error.code,
      message: error.message,
      details: error.details,
    });

    if (error.code) {
      const mapped = messageForSqlState(error.code);
      if (mapped) return mapped;
    }
    return GENERIC_ERROR_MESSAGE;
  }

  console.error(`[${context}] unexpected error`, error);
  return GENERIC_ERROR_MESSAGE;
}
