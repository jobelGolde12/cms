"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { SCHOOL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useScrolled } from "./useScrolled";

/** Section links available on the landing page itself. */
const SECTION_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#compliance", label: "Compliance" },
] as const;

/**
 * Mobile navigation drawer.
 *
 * Slides in from the right, is opaque, and is bounded to the viewport width
 * (`w-[min(19rem,calc(100vw-3rem))]`) so the brand and close button always
 * fit on narrow phones. While open it traps keyboard focus, closes on Escape
 * or backdrop tap, and restores focus to the trigger on close.
 */
function Drawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const getFocusable = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.offsetParent !== null);

    // Move focus to the close control once the dialog is visible.
    panel?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    // Keep the page behind the dialog out of the accessibility tree. Only the
    // page content (not the header that owns this dialog) may be inert.
    const background = [
      document.getElementById("main-content"),
      document.querySelector("footer"),
    ].filter((element): element is HTMLElement => element !== null);
    background.forEach((element) => {
      element.inert = true;
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      background.forEach((element) => {
        element.inert = false;
      });
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  return (
    <div
      id="welcome-mobile-nav"
      className={cn(
        "fixed inset-0 z-50 lg:hidden",
        open ? "visible" : "invisible",
      )}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-brand-950/45 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "absolute inset-y-0 right-0 flex w-[min(19rem,calc(100vw-3rem))] flex-col bg-white shadow-[0_0_48px_rgba(7,22,62,0.24)] transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-brand-100 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <Logo size="md" variant="mark" asLink priority />
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">
              Menu
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            data-autofocus
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[#64748B] transition-colors hover:bg-brand-50 hover:text-brand-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex flex-col px-3 py-4" aria-label="Mobile">
          {SECTION_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="flex min-h-11 items-center rounded-md px-2 text-[14px] font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/verify"
            onClick={onClose}
            className="flex min-h-11 items-center rounded-md px-2 text-[14px] font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
          >
            Verify a Record
          </Link>

          <Link
            href="/login"
            onClick={onClose}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-[3px] bg-brand-950 px-4 text-[13px] font-semibold text-white transition-colors duration-200 hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
          >
            Sign In
          </Link>
        </nav>

        <div className="mt-auto border-t border-brand-100 p-5 text-[11px] leading-[1.6] text-brand-600">
          <p className="break-words">
            {SCHOOL.name} · Records Management
          </p>
          <p className="mt-1 break-words">
            {SCHOOL.address} · {SCHOOL.region}
          </p>
        </div>
      </div>
    </div>
  );
}

export function WelcomeHeader() {
  const scrolled = useScrolled(8);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-white transition-[box-shadow,border-color] duration-300",
        scrolled
          ? "border-brand-200 shadow-[0_8px_24px_rgba(0,0,0,0.05)]"
          : "border-transparent",
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 md:px-10 lg:px-16">
        <div className="flex h-14 items-center justify-between gap-3 lg:h-16">
          {/* Brand lockup — single source of truth (see components/logo.tsx).
              min-w-0 lets the lockup's truncate engage on narrow screens. */}
          <div className="flex min-w-0 items-center">
            <Logo
              size="md"
              variant="lockup"
              asLink
              priority
              hideSchoolNameOnMobile
              markOnlyOnNarrow
              className="min-w-0"
            />
          </div>

          {/* Desktop navigation — hidden below lg; mobile users get the same
              destinations through the hamburger drawer. */}
          <div className="hidden shrink-0 items-center gap-1 lg:flex">
            <nav className="flex items-center" aria-label="Primary">
              {SECTION_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-[13px] font-medium text-brand-600 transition-colors duration-200 hover:text-brand-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <span
              className="mx-2 h-4 w-px bg-brand-200"
              aria-hidden="true"
            />

            <Link
              href="/verify"
              className="rounded-md px-3 py-2 text-[13px] font-medium text-brand-600 transition-colors duration-200 hover:text-brand-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
            >
              Verify a Record
            </Link>

            <Link
              href="/login"
              className="ml-2 inline-flex h-9 items-center rounded-[3px] bg-brand-950 px-4 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-600 focus-visible:ring-offset-2"
            >
              Sign In
            </Link>
          </div>

          {/* Mobile hamburger trigger — 44px touch target. */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            aria-controls="welcome-mobile-nav"
            aria-expanded={open}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-brand-900 transition-colors hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-600 lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <Drawer open={open} onClose={close} />
    </header>
  );
}
