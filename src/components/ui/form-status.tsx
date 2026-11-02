"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * SubmitButton — pending-aware submit button for server-action forms.
 *
 * Server Components can't observe `useFormStatus` themselves, so any
 * `<form action={serverAction}>` submitted from a plain <Button> used to give
 * no feedback and could be clicked twice. This client component uses
 * `useFormStatus()` to:
 *  - disable the button while the parent form's action is pending,
 *  - prevent duplicate submissions,
 *  - show a context-appropriate pending label and a quiet spinner,
 *  - restore the normal label automatically on success/failure.
 *
 * `className` keeps visual parity with <Button> (use `buttonStyles(...)`) or
 * with bespoke link-style buttons — styling is caller-supplied.
 * `children` receive `pending` via render-prop when the label must change
 * structurally; `pendingLabel` is the simple string case.
 */
export function SubmitButton({
  className,
  pendingLabel,
  formAction,
  children,
  "aria-label": ariaLabel,
}: {
  className: string;
  /** Label shown while the form action is pending (e.g. "Reviewing…"). */
  pendingLabel?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  children: ReactNode | ((pending: boolean) => ReactNode);
  "aria-label"?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      formAction={formAction}
      className={className}
      aria-label={ariaLabel}
      disabled={pending}
      aria-busy={pending || undefined}
    >
      {pending ? (
        <>
          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin" />
          {pendingLabel ?? "Working…"}
        </>
      ) : typeof children === "function" ? (
        children(false)
      ) : (
        children
      )}
    </button>
  );
}
