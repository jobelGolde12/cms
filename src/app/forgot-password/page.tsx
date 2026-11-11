"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { AlertCircle, MailCheck } from "lucide-react";
import { requestPasswordReset } from "@/actions/password-reset";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/form-status";
import { buttonStyles } from "@/components/ui/button";
import { useFormResetGuard } from "@/components/ui/form-reset-guard";
import { Logo } from "@/components/logo";

type ForgotState = Awaited<ReturnType<typeof requestPasswordReset>>;

const INITIAL: ForgotState = { ok: false, error: "" };

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(requestPasswordReset, INITIAL);
  const { formRef, onReset } = useFormResetGuard();
  const emailId = useId();

  return (
    <main className="flex min-h-screen flex-col bg-[#F4F7FC]">
      <header className="border-b border-[#DCE4F0] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 py-3 md:px-10 lg:px-16">
          <Logo size="lg" asLink priority />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[11px] font-bold uppercase tracking-wide text-brand-900">
              Republic of the Philippines
            </p>
            <p className="truncate text-[10px] font-medium text-[#64748B]">
              STA. MAGDALENA NHS • DEPED SORSOGON DIVISION
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-5 py-10 sm:px-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-brand-950">
            Forgot password
          </h1>
          <p className="mt-2 text-sm text-[#64748B]">
            Enter your school email and we will send reset instructions if an
            account exists for it.
          </p>
        </div>

        <div className="rounded-[6px] border border-[#DCE4F0] bg-white px-6 py-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          {state.ok ? (
            <div role="status" className="flex flex-col items-center gap-3 text-center">
              <MailCheck aria-hidden="true" className="h-9 w-9 text-brand-600" />
              <p className="text-sm font-medium text-brand-900">{state.message}</p>
              {state.devResetUrl ? (
                <div className="w-full rounded-md border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-900">
                  <p className="font-semibold">Development mode (no mail provider configured)</p>
                  <Link
                    href={state.devResetUrl}
                    className="mt-1 block break-all font-medium underline"
                  >
                    Open the password reset link
                  </Link>
                </div>
              ) : null}
              <Link href="/login" className={buttonStyles("outline", "md")}>
                Back to sign in
              </Link>
            </div>
          ) : (
            <form ref={formRef} action={formAction} onReset={onReset} className="space-y-5" noValidate>
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

              <Field label="School email" htmlFor={emailId} required>
                <Input
                  id={emailId}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="j.delacruz@deped.gov.ph"
                  required
                  maxLength={120}
                />
              </Field>

              <SubmitButton
                className={buttonStyles("secondary", "lg") + " w-full"}
                pendingLabel="Sending…"
              >
                Send reset instructions
              </SubmitButton>

              <p className="text-center text-xs text-[#64748B]">
                Remembered your password?{" "}
                <Link href="/login" className="font-semibold text-action-700 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
