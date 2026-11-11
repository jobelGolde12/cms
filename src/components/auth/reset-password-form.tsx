"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { resetPassword } from "@/actions/password-reset";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/form-status";
import { buttonStyles } from "@/components/ui/button";
import { useFormResetGuard } from "@/components/ui/form-reset-guard";

type ResetState = Awaited<ReturnType<typeof resetPassword>>;

const INITIAL: ResetState = { ok: false, error: "" };

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPassword, INITIAL);
  const [show, setShow] = useState(false);
  const { formRef, onReset } = useFormResetGuard();
  const prefix = useId();

  if (state.ok) {
    return (
      <div role="status" className="space-y-4 text-center">
        <p className="text-sm font-medium text-brand-900">{state.message}</p>
        <Link href="/login" className={buttonStyles("secondary", "md")}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} onReset={onReset} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />

      {state.error ? (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2.5 rounded-[4px] border border-red-200 bg-[#FEF2F2] px-3.5 py-3 text-sm font-medium text-red-800"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Field
        label="New password"
        htmlFor={`${prefix}-password`}
        required
        hint="At least 10 characters, including a letter and a number."
        error={state.fieldErrors?.password}
      >
        <div className="relative">
          <Input
            id={`${prefix}-password`}
            name="password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            className="pr-11"
            required
          />
          <button
            type="button"
            onClick={() => setShow((prev) => !prev)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#94A3B8] hover:text-[#14295F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      <Field
        label="Confirm new password"
        htmlFor={`${prefix}-confirm`}
        required
        error={state.fieldErrors?.confirmPassword}
      >
        <Input
          id={`${prefix}-confirm`}
          name="confirmPassword"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          required
        />
      </Field>

      <SubmitButton
        className={buttonStyles("secondary", "lg") + " w-full"}
        pendingLabel="Updating…"
      >
        Update password
      </SubmitButton>
    </form>
  );
}
