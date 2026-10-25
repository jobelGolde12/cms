"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { changePassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

/** Heuristic 0–3 score: length, mixed case, digit/symbol. */
function strengthOf(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score += 1;
  return score >= 3 ? 3 : (score as 1 | 2);
}

const STRENGTH_META = {
  0: { label: "", bar: "", text: "" },
  1: { label: "Weak", bar: "bg-[#DC2626]", text: "text-red-700" },
  2: { label: "Medium", bar: "bg-gold-500", text: "text-gold-700" },
  3: { label: "Strong", bar: "bg-emerald-600", text: "text-emerald-700" },
} as const;

/**
 * Security & Password — stacked fields, per-field visibility toggles and a
 * strength meter under the new-password field. Uses the existing
 * `changePassword` server action (current-password verification stays
 * server-side; the confirm field is client-side UX, the server still
 * validates against its own rules).
 */
export function SecuritySettings() {
  const [state, formAction, pending] = useActionState(changePassword, {
    ok: false,
    error: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const score = strengthOf(newPassword);
  const meta = STRENGTH_META[score];

  const eyeBtn = (show: boolean, toggle: () => void, label: string) => (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={show}
      className="absolute inset-y-0 right-2 flex items-center rounded text-[#64748B] hover:text-brand-900"
    >
      {show ? (
        <EyeOff aria-hidden="true" className="h-4 w-4" />
      ) : (
        <Eye aria-hidden="true" className="h-4 w-4" />
      )}
    </button>
  );

  return (
    <form action={formAction} className="flex min-h-full flex-col">
      <header className="border-b border-brand-100 px-6 py-5">
        <h2 className="text-base font-semibold text-brand-900">Security &amp; Password</h2>
        <p className="mt-0.5 text-sm text-[#64748B]">
          Ensure your account is using a long, random password to stay secure.
        </p>
      </header>

      <div className="flex-1 space-y-5 px-6 py-6 sm:max-w-md">
        <Field label="Current password" htmlFor="currentPassword" required>
          <div className="relative">
            <Input
              id="currentPassword"
              name="currentPassword"
              type={showCurrent ? "text" : "password"}
              autoComplete="current-password"
              required
              className="pr-10"
            />
            {eyeBtn(showCurrent, () => setShowCurrent(!showCurrent), "Show current password")}
          </div>
        </Field>

        <Field label="New password" htmlFor="newPassword" required hint="At least 8 characters.">
          <div className="relative">
            <Input
              id="newPassword"
              name="newPassword"
              type={showNew ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pr-10"
              aria-describedby="password-strength"
            />
            {eyeBtn(showNew, () => setShowNew(!showNew), "Show new password")}
          </div>
          {/* Strength meter */}
          <div id="password-strength" className="mt-2">
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-brand-100"
              role="status"
              aria-label={meta.label ? `Password strength: ${meta.label}` : "Password strength"}
            >
              <div
                className={`h-full rounded-full transition-all duration-200 ${meta.bar}`}
                style={{ width: score === 0 ? "0%" : `${(score / 3) * 100}%` }}
              />
            </div>
            {meta.label ? (
              <p className={`mt-1 text-xs font-medium ${meta.text}`}>{meta.label}</p>
            ) : null}
          </div>
        </Field>

        <Field label="Confirm new password" htmlFor="confirmPassword" required>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              required
              className="pr-10"
            />
            {eyeBtn(showConfirm, () => setShowConfirm(!showConfirm), "Show confirmation password")}
          </div>
        </Field>

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

      {/* Action bar */}
      <div className="sticky bottom-0 mt-auto flex items-center justify-end gap-2 border-t border-brand-100 bg-white px-6 py-3">
        <Button
          variant="outline"
          size="md"
          type="reset"
          disabled={pending}
          onClick={() => setNewPassword("")}
        >
          Cancel
        </Button>
        <Button type="submit" size="md" disabled={pending}>
          {pending ? "Updating…" : "Update Password"}
        </Button>
      </div>
    </form>
  );
}
