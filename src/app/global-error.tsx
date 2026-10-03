"use client";

import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-brand-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-[3px] border border-brand-200 bg-white p-8 text-center shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
          {/* Brand mark — single source of truth (see components/logo.tsx). */}
          <div className="mx-auto mb-4 flex w-fit">
            <Logo size="xl" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-brand-900">System Error</h1>
          <p className="mt-2 text-sm text-brand-500">
            A critical error occurred. Please refresh the page.
          </p>
          <Button type="button" onClick={reset} className="mt-6">
            Refresh
          </Button>
        </div>
      </body>
    </html>
  );
}
