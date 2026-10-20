"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { StudentForm } from "./student-form";

/**
 * "Add Student" modal (requested behavior: feature modal, not a page).
 *
 * Accessibility: role="dialog" + aria-modal, labelled by the title, Escape
 * closes, backdrop click closes, background scroll locked while open, focus
 * moves into the dialog on open and returns to the trigger on close.
 * Touch targets and form controls follow the existing design system.
 */
export function AddStudentModal() {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  // Background scroll lock while the dialog is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Focus management: into the dialog on open, back to trigger on close.
  useEffect(() => {
    if (open) {
      const first = dialogRef.current?.querySelector<HTMLElement>(
        "input, select, textarea, button",
      );
      first?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, [open]);

  // Escape-to-close + rudimentary focus trap.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const closeAndRefresh = useCallback(() => {
    setOpen(false);
    // Let the server components re-render the registry with the new record.
    router.refresh();
  }, [router]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
        Add Student Record
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-brand-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-brand-200 bg-brand-50 shadow-2xl sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-brand-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2 id={titleId} className="text-base font-semibold text-brand-950">
                  Add Student Record
                </h2>
                <p className="mt-0.5 text-xs text-[#64748B]">
                  Save as a draft or submit for verification. The student number
                  is generated automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close dialog"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#64748B] transition-colors hover:bg-brand-100 hover:text-brand-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <StudentForm mode="create" compact onSuccess={closeAndRefresh} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
