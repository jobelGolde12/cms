"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { QrCode, ShieldOff } from "lucide-react";
import { deactivateQr, generateQr } from "@/actions/qr";
import type { ActionState } from "@/actions/helpers";
import { useFormResetGuard } from "@/components/ui/form-reset-guard";

/**
 * QR token controls for the student profile.
 *
 * The QR Studio page tells staff that tokens are issued from the student's
 * profile — this component is that control. Generation is only offered for
 * records whose status allows it; revocation is only offered while a token is
 * actually live, so neither button is a no-op.
 *
 * Both buttons live in one form so they share a single action state: the
 * message shown is always the one belonging to the button that was pressed.
 */
export function QrActions({
  studentId,
  canGenerate,
  hasActiveToken,
}: {
  studentId: string;
  /** False for records whose status is not eligible for a QR label. */
  canGenerate: boolean;
  /** True while a live token exists. */
  hasActiveToken: boolean;
}) {
  const router = useRouter();
  const initial: ActionState = { ok: false, error: "" };
  const { formRef, onReset } = useFormResetGuard();

  const [state, action, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const intent = String(formData.get("intent") ?? "generate");
      const result =
        intent === "revoke" ? await deactivateQr(prev, formData) : await generateQr(prev, formData);
      if (result.ok) router.refresh();
      return result;
    },
    initial,
  );

  return (
    <form ref={formRef} action={action} onReset={onReset} className="space-y-3">
      <input type="hidden" name="studentId" value={studentId} />

      {state.ok === false && state.error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800"
        >
          {state.error}
        </div>
      ) : null}
      {state.ok === true && state.message ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
        >
          {state.message}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          name="intent"
          value="generate"
          disabled={pending || !canGenerate}
          title={
            canGenerate
              ? "Issue a new QR token (supersedes any earlier token)"
              : "QR labels can only be issued for verified records"
          }
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <QrCode aria-hidden="true" className="h-3.5 w-3.5" />
          {pending ? "Working…" : hasActiveToken ? "Re-issue QR" : "Generate QR"}
        </button>

        <button
          type="submit"
          name="intent"
          value="revoke"
          disabled={pending || !hasActiveToken}
          title={hasActiveToken ? "Revoke the live QR token" : "There is no live token to revoke"}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-brand-200 bg-white px-3 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShieldOff aria-hidden="true" className="h-3.5 w-3.5" />
          {pending ? "Working…" : "Revoke QR"}
        </button>

        {!canGenerate ? (
          <p className="text-[11px] text-[#64748B]">
            QR labels are only issued for verified records.
          </p>
        ) : null}
      </div>
    </form>
  );
}
