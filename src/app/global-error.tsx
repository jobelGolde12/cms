"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-brand-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-brand-200 bg-white shadow-xl p-8 text-center">
          <h1 className="text-2xl font-extrabold text-brand-900 mb-2">System Error</h1>
          <p className="text-brand-500 mb-6">A critical error occurred. Please refresh the page.</p>
          <button
            onClick={() => reset()}
            className="inline-flex items-center rounded-lg bg-action-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-action-800 shadow-sm"
          >
            Refresh
          </button>
        </div>
      </body>
    </html>
  );
}
