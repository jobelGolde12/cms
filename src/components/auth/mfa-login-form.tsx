"use client";

import { useActionState, useId } from "react";
import { AlertCircle } from "lucide-react";
import { cancelMfaLogin, verifyMfaLogin } from "@/actions/mfa";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/form-status";
import { buttonStyles } from "@/components/ui/button";
import { useFormResetGuard } from "@/components/ui/form-reset-guard";

type MfaState = Awaited<ReturnType<typeof verifyMfaLogin>>;

const INITIAL: MfaState = { ok: false, error: "" };

export function MfaLoginForm() {
  const [state, formAction] = useActionState(verifyMfaLogin, INITIAL);
  const { formRef, onReset } = useFormResetGuard();
  const codeId = useId();

  return (
    <div className="space-y-5">
      <form ref={formRef} action={formAction} onReset={onReset} className="space-y-5" noValidate>
        {state.ok === false && state.error ? (
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
          label="Verification code"
          htmlFor={codeId}
          required
          hint="6-digit authenticator code, or a recovery code (e.g. ABCD-EFGH)."
        >
          <Input
            id={codeId}
            name="code"
            inputMode="text"
            autoComplete="one-time-code"
            autoFocus
            maxLength={20}
            required
            placeholder="123456"
          />
        </Field>

        <SubmitButton
          className={buttonStyles("secondary", "lg") + " w-full"}
          pendingLabel="Verifying…"
        >
          Verify and sign in
        </SubmitButton>
      </form>

      <form action={cancelMfaLogin}>
        <SubmitButton
          className="w-full text-center text-xs font-medium text-[#64748B] hover:text-brand-900"
          pendingLabel="Cancelling…"
        >
          Cancel and return to sign in
        </SubmitButton>
      </form>
    </div>
  );
}
