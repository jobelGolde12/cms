"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { updateProfile } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

/**
 * Profile Information — the editable name fields plus read-only account
 * context (school email tied to the login identity, role badge). The save
 * action is the existing `updateProfile` server action; it revalidates the
 * page server-side, so saved values appear after the revalidate.
 */
export function ProfileSettings({
  firstName,
  lastName,
  email,
  roleLabel,
}: {
  firstName: string;
  lastName: string;
  email: string;
  roleLabel: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, { ok: false, error: "" });
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";

  return (
    <form action={formAction} className="flex min-h-full flex-col">
      <header className="border-b border-brand-100 px-6 py-5">
        <h2 className="text-base font-semibold text-brand-900">Profile Information</h2>
        <p className="mt-0.5 text-sm text-[#64748B]">
          Update your personal details and school email.
        </p>
      </header>

      <div className="flex-1 space-y-6 px-6 py-6">
        {/* Avatar (uploads not wired — no avatar storage exists yet) */}
        <div className="flex flex-wrap items-center gap-4">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-900 text-lg font-semibold text-white shadow-sm"
          >
            {initials}
          </span>
          <div>
            <button
              type="button"
              disabled
              title="Avatar upload is not available yet"
              className="inline-flex h-9 cursor-not-allowed items-center justify-center rounded-lg border border-[#DCE4F0] bg-white px-3 text-sm font-medium text-[#263449] opacity-50"
            >
              Change picture
            </button>
            <p className="mt-1.5 text-xs text-[#64748B]">JPG or PNG, up to 2 MB.</p>
          </div>
        </div>

        {/* Name */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="firstName" required>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={firstName}
              required
              maxLength={60}
              autoComplete="given-name"
            />
          </Field>
          <Field label="Last name" htmlFor="lastName" required>
            <Input
              id="lastName"
              name="lastName"
              defaultValue={lastName}
              required
              maxLength={60}
              autoComplete="family-name"
            />
          </Field>
        </div>

        {/* Read-only account context */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="School email address" htmlFor="profileEmail">
            <div className="relative">
              <Input
                id="profileEmail"
                value={email}
                readOnly
                tabIndex={-1}
                className="cursor-default bg-brand-50 pr-9 text-[#64748B]"
                aria-describedby="profileEmail-locked"
              />
              <Lock
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]"
              />
            </div>
            <p id="profileEmail-locked" className="text-xs text-[#64748B]">
              Tied to your login — only an administrator can change it.
            </p>
          </Field>
          <Field label="Role" htmlFor="profileRole">
            <div
              id="profileRole"
              className="inline-flex h-11 w-full cursor-default items-center rounded-lg border border-brand-300 bg-brand-50 px-3"
            >
              <span className="inline-flex items-center rounded-full border border-[#C9D8FF] bg-[#E0EAFF] px-2 py-0.5 text-xs font-medium text-[#14295F]">
                {roleLabel}
              </span>
            </div>
          </Field>
        </div>

        {state.ok === false && state.error ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            {state.error}
          </p>
        ) : null}
        {state.ok && state.message ? (
          <p role="status" className="text-sm font-medium text-emerald-700">
            {state.message}
          </p>
        ) : null}
      </div>

      {/* Action bar — right aligned, distinct from the form fields */}
      <div className="sticky bottom-0 mt-auto flex items-center justify-end gap-2 border-t border-brand-100 bg-white px-6 py-3">
        <Button variant="outline" size="md" type="reset" disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" size="md" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
