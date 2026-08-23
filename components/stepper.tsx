// =============================================================================
// VAYTU — Onboarding stepper (mobile-first)
// =============================================================================
// Plain, easy to re-skin later: a row of numbered dots + the current step's
// label, one screen = one decision. No client JS needed — pure server
// component driven by props.
// =============================================================================
interface StepperProps {
  steps: readonly string[];
  labels: Record<string, string>;
  current: string;
}

export function Stepper({ steps, labels, current }: StepperProps) {
  const currentIndex = steps.indexOf(current);

  return (
    <div className="mb-6 space-y-2">
      <div className="flex items-center gap-1.5">
        {steps.map((step, i) => (
          <div
            key={step}
            className={`h-1.5 flex-1 rounded-full ${
              i <= currentIndex
                ? 'bg-zinc-950 dark:bg-zinc-50'
                : 'bg-zinc-200 dark:bg-zinc-800'
            }`}
            aria-hidden
          />
        ))}
      </div>
      <p className="text-xs font-medium text-zinc-500">
        Passo {currentIndex + 1} di {steps.length} — {labels[current]}
      </p>
    </div>
  );
}
