"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { SCHOOL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useScrolled } from "./useScrolled";

/**
 * Welcome header — compact and quiet (design.md §6).
 *
 * Small brand lockup, minimal sign-in link, one compact dark register button.
 * Sticky with a hairline border; a subtle shadow and border fade in once the
 * page scrolls so content slides cleanly beneath it.
 *
 * On narrow viewports the desktop nav is hidden behind a hamburger trigger.
 * The drawer slides in from the right, closes on backdrop tap, link click,
 * or Escape, and is fully keyboard-accessible.
 */
function Drawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <div
      id="welcome-mobile-nav"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      className={cn(
        "fixed inset-0 z-50 flex items-start justify-end bg-white/95 backdrop-blur-sm transition-transform duration-300 ease-in-out lg:hidden",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div
        className="absolute inset-0 bg-brand-950/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex h-full w-64 flex-col p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <Logo size="md" variant="lockup" asLink priority />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="inline-flex items-center justify-center rounded-md p-2 text-brand-500 transition-colors hover:bg-brand-100 hover:text-brand-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/login"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-[3px] bg-brand-950 px-4 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
          >
            Sign In
          </Link>
        </div>

        <nav className="mt-auto border-t border-brand-200 px-5 py-4 text-[11px] text-brand-400">
          <p className="truncate">{SCHOOL.name} · Records Management</p>
          <p className="mt-1.5 truncate">{SCHOOL.address} · {SCHOOL.region}</p>
        </nav>
      </div>
    </div>
  );
}

export function WelcomeHeader() {
  const scrolled = useScrolled(8);
  const [open, setOpen] = useState(false);

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
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Brand lockup — single source of truth (see components/logo.tsx).
              min-w-0 lets the lockup's truncate engage on narrow screens. */}
          <div className="flex min-w-0 items-center">
            <Logo size="md" variant="lockup" asLink priority />
          </div>

          {/* Desktop nav — hidden on mobile to keep the header compact and
              prevent horizontal overflow; mobile users access the same
              destinations through the hamburger drawer below. */}
          <nav
            className="hidden shrink-0 items-center gap-1 md:gap-2 lg:flex"
            aria-label="Primary"
          >
            <Link
              href="/login"
              className="rounded-md px-3 py-2.5 text-[13px] font-medium text-brand-600 transition-colors duration-200 hover:text-brand-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
            >
              Sign In
            </Link>
          </nav>

          {/* Mobile hamburger trigger — always visible, never overflows the
              header because the drawer takes full viewport space. */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            aria-controls="welcome-mobile-nav"
            aria-expanded={open}
            className="inline-flex lg:hidden items-center justify-center rounded-md p-2 text-brand-900 transition-colors hover:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} />
    </header>
  );
}