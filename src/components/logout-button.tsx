"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/actions/auth";

/**
 * Sign out via the logout Server Action instead of the GET /logout route.
 *
 * Next.js prefetches <Link> targets that are visible in the viewport; a
 * prefetch of GET /logout executes the route handler, which destroys the
 * server session even though the user never clicked "Sign out". Server
 * Actions are never prefetched, so using one here makes sign-out strictly
 * user-initiated.
 */
export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => logout())}
      aria-label="Sign out"
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-brand-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
      {compact ? null : <span>{pending ? "Signing out…" : "Sign out"}</span>}
    </button>
  );
}
