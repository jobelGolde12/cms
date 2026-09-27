"use client";

/**
 * Route-level error boundary for the authenticated app group. Shows a
 * recoverable, non-technical message (no internals per security rules) and
 * matches the existing design language.
 */
export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-6 w-6"
        >
          <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
      </div>
      <p className="text-base font-semibold text-brand-900">Something went wrong</p>
      <p className="max-w-md text-sm text-brand-500">
        This page could not be loaded. Your data is safe — please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-1 inline-flex h-9 items-center rounded-md bg-action-700 px-4 text-[13px] font-medium text-white transition-colors hover:bg-action-800"
      >
        Try again
      </button>
    </div>
  );
}
