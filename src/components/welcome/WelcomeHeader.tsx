"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { useScrolled } from "./useScrolled";

/**
 * Welcome header — compact and quiet (design.md §6).
 *
 * Small brand lockup, minimal sign-in link, one compact dark register button.
 * Sticky with a hairline border; a subtle shadow and border fade in once the
 * page scrolls so content slides cleanly beneath it.
 */
export function WelcomeHeader() {
  const scrolled = useScrolled(8);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b bg-white transition-[box-shadow,border-color] duration-300",
        scrolled
          ? "border-brand-200 shadow-[0_8px_24px_rgba(0,0,0,0.05)]"
          : "border-transparent",
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-4 md:px-10 lg:px-16">
        <div className="flex h-16 items-center justify-between gap-4 md:h-14 md:gap-6">
          {/* Brand lockup — single source of truth (see components/logo.tsx).
              min-w-0 lets the lockup's truncate engage on narrow screens. */}
          <div className="flex min-w-0 items-center">
            <Logo size="md" variant="lockup" asLink priority />
          </div>

          <nav className="flex shrink-0 items-center gap-1 md:gap-2" aria-label="Primary">
            <Link
              href="/login"
              className="rounded-md px-3 py-2.5 text-[13px] font-medium text-brand-600 transition-colors duration-200 hover:text-brand-950"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center rounded-[3px] bg-brand-950 px-4 text-[12px] font-medium text-white transition-colors duration-200 hover:bg-brand-800"
            >
              Register
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
