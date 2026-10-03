"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <div className="flex h-12 w-12 items-center justify-center rounded-[3px] border border-red-200 bg-status-error-bg">
        <TriangleAlert aria-hidden="true" className="h-6 w-6 text-red-700" />
      </div>
      <p className="text-base font-semibold text-brand-900">Something went wrong</p>
      <p className="max-w-md text-sm text-brand-500">
        This page could not be loaded. Your data is safe — please try again.
      </p>
      <Button type="button" onClick={reset} className="mt-1" size="sm">
        Try again
      </Button>
    </div>
  );
}
