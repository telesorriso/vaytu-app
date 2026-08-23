import { SignupForm } from './signup-form';

export default function SignupPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Registrati
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Solo Creator e Business possono registrarsi da qui. Gli account
            Admin non sono registrabili pubblicamente.
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
