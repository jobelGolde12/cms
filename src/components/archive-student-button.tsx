"use client";

import { useEffect, useRef, useState } from "react";
import { archiveStudentForm } from "@/actions/students";
import { AlertTriangle, X } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/** Archive (soft delete) control for the student profile page. */
export function ArchiveStudentButton({
  studentId,
  studentNumber,
}: {
  studentId: string;
  studentNumber: string;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Escape closes; Tab is trapped inside the dialog; background scroll locks.
  // Focus moves to the least-destructive action on open and returns to the
  // trigger on close.
  useEffect(() => {
    if (!showConfirm) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowConfirm(false);
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      (previouslyFocused ?? trigger)?.focus?.();
    };
  }, [showConfirm]);

  return (
    <>
      <form
        action={archiveStudentForm}
        onSubmit={(e) => {
          if (!showConfirm) {
            e.preventDefault();
            setShowConfirm(true);
          }
        }}
        className="inline-flex"
      >
        <input type="hidden" name="studentId" value={studentId} />
        <button
          ref={triggerRef}
          type="submit"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition-all duration-150 hover:bg-red-50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          aria-label="Archive record"
          aria-haspopup="dialog"
          aria-expanded={showConfirm}
        >
          Archive
        </button>
      </form>

      {showConfirm ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/30 backdrop-blur-[2px] animate-[fadeIn_150ms_ease-out]"
          onClick={() => setShowConfirm(false)}
        >
          <div
            ref={dialogRef}
            className="mx-4 w-full max-w-sm rounded-xl border border-red-200 bg-white p-6 shadow-2xl animate-[rise-in_200ms_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertTriangle aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h3 id="archive-dialog-title" className="text-sm font-bold text-brand-950">
                  Archive this record?
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                  Record <strong className="text-brand-800">{studentNumber}</strong> will be hidden from active lists and its QR codes revoked. History is retained.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <form action={archiveStudentForm} onSubmit={() => setShowConfirm(false)}>
                <input type="hidden" name="studentId" value={studentId} />
                <button
                  type="submit"
                  className="inline-flex h-9 items-center rounded-md bg-red-700 px-4 text-xs font-semibold text-white transition-all hover:bg-red-800 active:scale-[0.98]"
                >
                  Confirm archive
                </button>
              </form>
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setShowConfirm(false)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-brand-200 bg-white px-4 text-xs font-medium text-brand-700 transition-all hover:bg-brand-50 active:scale-[0.98]"
                aria-label="Cancel"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
