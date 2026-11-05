"use client";

import { useCallback, useRef, type FormEvent } from "react";

/**
 * React 19 resets every `<form action={serverAction}>` as soon as the action
 * starts: react-dom calls `requestFormReset()` → `form.reset()` (see
 * `startHostTransition` in react-dom-client). The reset restores each
 * uncontrolled field to its `defaultValue`, so what the user typed disappears
 * the moment they press Submit — and it disappears even when the server
 * rejects the submission with a validation error, leaving an empty form with
 * an error message and no way to tell what was lost.
 *
 * `form.reset()` dispatches a *cancelable* `reset` event, so cancelling that
 * event keeps the user's input intact while the request is in flight and after
 * a rejected submission. Forms that want a clean slate after a successful save
 * call `resetNow()`, which performs an explicit reset.
 *
 * Usage:
 * ```tsx
 * const { formRef, onReset, resetNow } = useFormResetGuard();
 * <form ref={formRef} action={formAction} onReset={onReset}> … </form>
 * ```
 */
export function useFormResetGuard() {
  const formRef = useRef<HTMLFormElement | null>(null);
  /** Set while an explicit, intentional reset is running. */
  const allowReset = useRef(false);

  const onReset = useCallback((event: FormEvent<HTMLFormElement>) => {
    if (allowReset.current) return;
    // React's automatic post-action reset — keep the user's input.
    event.preventDefault();
  }, []);

  /** Explicitly clear the form (e.g. after a successful create). */
  const resetNow = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    allowReset.current = true;
    try {
      form.reset();
    } finally {
      allowReset.current = false;
    }
  }, []);

  return { formRef, onReset, resetNow };
}
