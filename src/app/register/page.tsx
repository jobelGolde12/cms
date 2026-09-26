"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ShieldCheck, UserPlus, Lock, Building2, Mail, KeyRound, Check } from "lucide-react";
import { registerUser } from "@/actions/register";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Label, FieldError } from "@/components/ui/field";

import type { ActionState } from "@/actions/helpers";

const initial: ActionState = { ok: false, error: "" };

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerUser, initial);
  const [agreed, setAgreed] = useState(false);

  return (
    <main className="min-h-screen bg-brand-50">
      {/* Header */}
      <header className="border-b border-brand-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-900 text-white shadow-sm">
              <Building2 aria-hidden="true" className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-[11px] font-bold uppercase tracking-wide text-brand-900">Republic of the Philippines</p>
              <p className="text-[10px] font-medium text-brand-500">LGU STA. MAGDALENA • DEPED SORSOGON DIVISION</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-800">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-action-700" />
            <span>Official Personnel Portal</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
        <div className="rounded-2xl border border-brand-200 bg-white px-8 py-10 shadow-lg shadow-brand-100/50 md:px-12 md:py-14">
          {/* Card Header */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-action-50 shadow-sm">
              <UserPlus aria-hidden="true" className="h-8 w-8 text-action-700" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-brand-950 md:text-4xl">Personnel Registration</h1>
            <p className="mt-2 text-sm text-brand-500">Apply for authorized system access</p>
          </div>

          {/* Form */}
          <form action={formAction} className="mt-10 space-y-6">
            {!state.ok && state.error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-status-error-bg px-4 py-3 text-sm font-medium text-red-800"
              >
                {state.error}
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2 md:gap-6">
              <Field label="First Name" htmlFor="firstName" required error={state.ok === false ? state.fieldErrors?.firstName ?? undefined : undefined}>
                <Input id="firstName" name="firstName" type="text" placeholder="e.g. Maria" autoComplete="given-name" required />
              </Field>

              <Field label="Last Name" htmlFor="lastName" required error={state.ok === false ? state.fieldErrors?.lastName ?? undefined : undefined}>
                <Input id="lastName" name="lastName" type="text" placeholder="e.g. Santos" autoComplete="family-name" required />
              </Field>

              <Field label="Official Email Address" htmlFor="email" required error={state.ok === false ? state.fieldErrors?.email ?? undefined : undefined}>
                <Input id="email" name="email" type="email" placeholder="name@deped.gov.ph" autoComplete="email" required />
              </Field>

              <Field label="Operational Role" htmlFor="roleId" required error={state.ok === false ? state.fieldErrors?.roleId ?? undefined : undefined}>
                <Select id="roleId" name="roleId" required defaultValue="">
                  <option value="">Select role</option>
                  <option value="role-admin">System Administrator</option>
                  <option value="role-lgu">LGU User</option>
                  <option value="role-barangay">Barangay User</option>
                </Select>
              </Field>

              <div className="md:col-span-2">
                <Field label="Assigned Station / Barangay" htmlFor="barangayId" hint="Select your assigned station or barangay">
                  <Input id="barangayId" name="barangayId" type="text" placeholder="e.g. Poblacion 1 / Sta. Magdalena" />
                </Field>
              </div>

              <Field label="Password" htmlFor="password" required>
                <Input id="password" name="password" type="password" placeholder="At least 8 characters" autoComplete="new-password" required />
              </Field>

              <Field label="Confirm Password" htmlFor="confirmPassword" required>
                <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Re-enter your password" autoComplete="new-password" required />
              </Field>
            </div>

            {/* Privacy / Compliance */}
            <div className="rounded-xl bg-action-50/60 px-5 py-4">
              <label className="flex items-start gap-3 text-sm text-brand-800">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-brand-300 text-action-700 focus:ring-action-600"
                  required
                />
                <span>
                  I agree to comply with{" "}
                  <strong className="text-brand-900">RA 10173 (Data Privacy Act)</strong> and{" "}
                  <strong className="text-brand-900">DepEd Child Protection Policy</strong>.
                </span>
              </label>
              {!agreed ? (
                <p className="mt-2 pl-7 text-xs text-red-700">You must agree to the privacy and protection policy to register.</p>
              ) : null}
            </div>

            {/* Submit */}
            <Button type="submit" size="lg" className="w-full bg-action-700 hover:bg-action-800" disabled={pending || !agreed}>
              <Lock aria-hidden="true" className="h-4 w-4" />
              {pending ? "Submitting…" : "Submit Registration"}
            </Button>

            {/* Back link */}
            <div className="text-center">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-900 hover:underline underline-offset-4">
                <KeyRound aria-hidden="true" className="h-3.5 w-3.5" />
                Cancel / Back to Sign In
              </Link>
            </div>
          </form>
        </div>

        {/* Footer */}
        <footer className="mt-10 text-center text-[11px] text-brand-400">
          <p>
            © 2026 Municipal Government of Sta. Magdalena · DepEd Schools Division of Sorsogon · Compliant with{" "}
            <span className="font-medium text-brand-500">RA 10173</span> and{" "}
            <span className="font-medium text-brand-500">DepEd Child Protection Policy</span>
          </p>
        </footer>
      </div>
    </main>
  );
}
