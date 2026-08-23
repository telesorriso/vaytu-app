'use client';

import Link from 'next/link';

interface ApplyButtonProps {
  experienceId: string;
}

export function ApplyButton({ experienceId }: ApplyButtonProps) {
  return (
    <Link
      href={`/creator/experiences/${experienceId}/apply`}
      className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
    >
      Candidati
    </Link>
  );
}
