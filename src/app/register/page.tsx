"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { registerAccount } from "@/actions/registration";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/form-status";
import { buttonStyles } from "@/components/ui/button";
import { useFormResetGuard } from "@/components/ui/form-reset-guard";
import { Logo } from "@/components/logo";
import {
  REGISTRATION_POSITIONS,
  REGISTRATION_POSITION_LABELS,
} from "@/lib/constants";

type RegisterState = Awaited<ReturnType<typeof registerAccount>>;

const INITIAL: RegisterState = { ok: false, error: "" };

export default function RegisterPage() {
  const [state, formAction] = useActionState(registerAccount, INITIAL);
  const [showPassword, setShowPassword] = useState(false);
  const { formRef, onReset } = useFormResetGuard();
  const prefix = useId();

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

      <div className="mx-auto w-full max-w-[560px] flex-1 px-5 py-10 sm:px-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-brand-950">
            Request an account
          </h1>
          <p className="mt-2 text-sm text-[#64748B]">
            School personnel may request access. An administrator reviews every
            request and assigns the appropriate role — you cannot sign in until
            it is approved.
          </p>
        </div>

        <div className="rounded-[6px] border border-[#DCE4F0] bg-white px-6 py-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] sm:px-8">
          {state.ok ? (
            <div
              role="status"
              className="flex flex-col items-center gap-3 py-6 text-center"
            >
              <CheckCircle2 aria-hidden="true" className="h-10 w-10 text-success" />
              <h2 className="text-lg font-semibold text-brand-900">
                Registration submitted
              </h2>
              <p className="max-w-sm text-sm text-[#64748B]">{state.message}</p>
              <Link href="/login" className={buttonStyles("secondary", "md")}>
                Back to sign in
              </Link>
            </div>
          ) : (
            <form
              ref={formRef}
              action={formAction}
              onReset={onReset}
              className="space-y-4"
              noValidate
            >
              {state.error ? (
                <div
                  role="alert"
                  aria-live="polite"
                  className="flex items-start gap-2.5 rounded-[4px] border border-red-200 bg-[#FEF2F2] px-3.5 py-3 text-sm font-medium text-red-800"
                >
                  <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="leading-snug">{state.error}</span>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="First name"
                  htmlFor={`${prefix}-first`}
                  required
                  error={state.fieldErrors?.firstName}
                >
                  <Input id={`${prefix}-first`} name="firstName" autoComplete="given-name" maxLength={60} required />
                </Field>
                <Field label="Middle name" htmlFor={`${prefix}-middle`}>
                  <Input id={`${prefix}-middle`} name="middleName" autoComplete="additional-name" maxLength={60} />
                </Field>
              </div>

              <Field
                label="Last name"
                htmlFor={`${prefix}-last`}
                required
                error={state.fieldErrors?.lastName}
              >
                <Input id={`${prefix}-last`} name="lastName" autoComplete="family-name" maxLength={60} required />
              </Field>

              <Field
                label="DepEd / school email"
                htmlFor={`${prefix}-email`}
                required
                hint="Use the address your school issues. Approval notices are sent here."
                error={state.fieldErrors?.email}
              >
                <Input
                  id={`${prefix}-email`}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={120}
                  required
                />
              </Field>

              <Field
                label="Contact number"
                htmlFor={`${prefix}-phone`}
                hint="Optional. Mobile (0917 123 4567) or landline."
                error={state.fieldErrors?.phone}
              >
                <Input id={`${prefix}-phone`} name="phone" type="tel" autoComplete="tel" maxLength={20} />
              </Field>

              <Field
                label="Position you are requesting"
                htmlFor={`${prefix}-position`}
                required
                hint="Your requested position does not grant system access; the administrator assigns your role."
                error={state.fieldErrors?.requestedPosition}
              >
                <Select id={`${prefix}-position`} name="requestedPosition" defaultValue="" required>
                  <option value="" disabled>
                    Select a position
                  </option>
                  {REGISTRATION_POSITIONS.map((position) => (
                    <option key={position} value={position}>
                      {REGISTRATION_POSITION_LABELS[position]}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Note to the administrator"
                htmlFor={`${prefix}-note`}
                hint="Optional. Do not include sensitive personal information."
                error={state.fieldErrors?.registrationNote}
              >
                <Textarea id={`${prefix}-note`} name="registrationNote" maxLength={300} rows={2} />
              </Field>

              <Field
                label="Password"
                htmlFor={`${prefix}-password`}
                required
                hint="At least 10 characters, including a letter and a number."
                error={state.fieldErrors?.password}
              >
                <div className="relative">
                  <Input
                    id={`${prefix}-password`}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="pr-11"
                    required
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
              </Field>

              <Field
                label="Confirm password"
                htmlFor={`${prefix}-confirm`}
                required
                error={state.fieldErrors?.confirmPassword}
              >
                <Input
                  id={`${prefix}-confirm`}
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                />
              </Field>

              <SubmitButton
                className={buttonStyles("secondary", "lg") + " w-full"}
                pendingLabel="Submitting…"
              >
                Submit registration
              </SubmitButton>

              <p className="text-center text-xs text-[#64748B]">
                Already approved?{" "}
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
