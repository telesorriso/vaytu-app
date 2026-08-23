// =============================================================================
// VAYTU — Supabase environment configuration
// =============================================================================
// Only public, browser-safe values live here: the project URL and the
// anon/publishable key. Both are meant to be shipped to the client — they
// carry no privilege on their own; Row Level Security (see
// /supabase/migrations and /docs/SECURITY_MODEL.md) is what actually gates
// access. The service_role key must NEVER be read here or anywhere in this
// app — see /docs/SECURITY_MODEL.md ("service_role / chiavi").
// =============================================================================

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env.local and fill it in — see /docs/DATABASE.md for where to find these values.`
    );
  }
  return value;
}

export const supabaseUrl = () => requireEnv('NEXT_PUBLIC_SUPABASE_URL');
export const supabaseAnonKey = () =>
  requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
