"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log server-side for diagnostics; do not expose details to users.
    console.error("[production error]", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-50 px-4">
      <div className="max-w-md w-full rounded-2xl border border-brand-200 bg-white shadow-xl p-8 text-center">
        <h1 className="text-2xl font-extrabold text-brand-900 mb-2">Something went wrong</h1>
        <p className="text-brand-500 mb-6">An unexpected error occurred. Please try again.</p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center rounded-lg bg-action-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-action-800 shadow-sm"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
