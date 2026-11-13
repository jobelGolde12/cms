"use client";

import { useActionState, useId, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, Eye, EyeOff, Lock } from "lucide-react";
import { resetPassword } from "@/actions/password-reset";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/form-status";
import { buttonStyles } from "@/components/ui/button";
import { useFormResetGuard } from "@/components/ui/form-reset-guard";

type ResetState = Awaited<ReturnType<typeof resetPassword>>;

const INITIAL: ResetState = { ok: false, error: "" };

const REQUIREMENTS = [
  { id: "length", label: "At least 10 characters", test: (v: string) => v.length >= 10 },
  { id: "letter", label: "Contains a letter", test: (v: string) => /[A-Za-z]/.test(v) },
  { id: "number", label: "Contains a number", test: (v: string) => /\d/.test(v) },
] as const;

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPassword, INITIAL);
  const { formRef, onReset } = useFormResetGuard();
  const prefix = useId();

  const passwordId = `${prefix}-password`;
  const confirmId = `${prefix}-confirm`;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordIssues = useMemo(
    () => REQUIREMENTS.filter((r) => !r.test(password)),
    [password],
  );

  if (state.ok) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 text-center">
        <Check aria-hidden="true" className="h-9 w-9 text-brand-600" />
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
        htmlFor={passwordId}
        required
        error={state.fieldErrors?.password}
      >
        <div className="relative">
          <Input
            id={passwordId}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(state.fieldErrors?.password) || undefined}
            aria-describedby={state.fieldErrors?.password ? `${passwordId}-error` : undefined}
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#94A3B8] hover:text-[#14295F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {passwordIssues.length === 0 && password.length > 0 ? (
          <p className="text-xs font-medium text-emerald-700" aria-live="polite">
            <Check className="inline h-3.5 w-3.5" aria-hidden="true" /> Password requirements met.
          </p>
        ) : null}
      </Field>

      <div className="rounded-[4px] border border-[#DCE4F0] bg-[#F8FAFE] px-3.5 py-3">
        <ul className="space-y-1" aria-label="Password requirements">
          {REQUIREMENTS.map((r) => {
            const met = r.test(password);
            return (
              <li
                key={r.id}
                className={`flex items-center gap-2 text-xs ${
                  met ? "text-emerald-700" : "text-[#64748B]"
                }`}
              >
                {met ? (
                  <Check aria-hidden="true" className="h-3.5 w-3.5" />
                ) : (
                  <Lock aria-hidden="true" className="h-3.5 w-3.5 text-[#94A3B8]" />
                )}
                <span>{r.label}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <Field
        label="Confirm new password"
        htmlFor={confirmId}
        required
        error={state.fieldErrors?.confirmPassword}
      >
        <div className="relative">
          <Input
            id={confirmId}
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={128}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={Boolean(state.fieldErrors?.confirmPassword) || undefined}
            aria-describedby={state.fieldErrors?.confirmPassword ? `${confirmId}-error` : undefined}
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((prev) => !prev)}
            aria-label={showConfirm ? "Hide password" : "Show password"}
            aria-pressed={showConfirm}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#94A3B8] hover:text-[#14295F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
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
