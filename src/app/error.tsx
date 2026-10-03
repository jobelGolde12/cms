"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonStyles } from "@/components/ui/button";

/**
 * Root error boundary. Restrained, institutional presentation consistent with
 * the login/register card style: no decorative effects, a clear explanation,
 * and two recovery paths (retry / back to home). Technical details stay in
 * the console — never shown to users.
 */
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
    <main className="flex min-h-screen items-center justify-center bg-brand-50 px-4 py-12">
      <div className="rise w-full max-w-md rounded-[3px] border border-brand-200 bg-white p-8 text-center shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
        <div className="mb-4 flex justify-center">
          <Logo size="xl" />
        </div>

        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[3px] border border-red-200 bg-status-error-bg">
          <TriangleAlert aria-hidden="true" className="h-6 w-6 text-red-700" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-brand-900">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-500">
          The page could not be loaded. Your data is safe — please try again.
          If the problem persists, contact the system administrator.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={reset} className={buttonStyles("primary", "md")}>
            Try again
          </button>
          <Link href="/" className={buttonStyles("outline", "md")}>
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
