"use client";

import { useActionState } from "react";
import { saveHealthRecord } from "@/actions/health";
import { Button } from "@/components/ui/button";
import { NUTRITIONAL_STATUSES, NUTRITIONAL_STATUS_LABELS } from "@/lib/constants";

/**
 * Nutritional status form (Nurse). The server action re-validates
 * permissions, scope, numeric ranges, and duplicates — this client form only
 * mirrors the same validation for early feedback.
 */
export function HealthRecordForm({ studentId }: { studentId: string }) {
  const [state, formAction, pending] = useActionState(saveHealthRecord, {
    ok: false,
    error: "",
  });

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="studentId" value={studentId} />

      {state.ok === false && state.error ? (
        <p role="alert" className="text-xs font-medium text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.ok && state.message ? (
        <p role="status" className="text-xs font-medium text-emerald-700">
          {state.message}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="health-date"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brand-500"
          >
            Measurement date
          </label>
          <input
            id="health-date"
            name="measurementDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="health-status"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brand-500"
          >
            Nutritional status
          </label>
          <select
            id="health-status"
            name="nutritionalStatus"
            defaultValue=""
            className="w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none"
          >
            <option value="">Not recorded</option>
            {NUTRITIONAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {NUTRITIONAL_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="health-weight"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brand-500"
          >
            Weight (kg)
          </label>
          <input
            id="health-weight"
            name="weightKg"
            type="number"
            step="0.1"
            min="5"
            max="200"
            inputMode="decimal"
            className="numeric w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="health-height"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brand-500"
          >
            Height (cm)
          </label>
          <input
            id="health-height"
            name="heightCm"
            type="number"
            step="0.1"
            min="60"
            max="250"
            inputMode="decimal"
            className="numeric w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="health-remarks"
          className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brand-500"
        >
          Remarks (optional)
        </label>
        <textarea
          id="health-remarks"
          name="remarks"
          rows={2}
          maxLength={300}
          className="w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-[13px] text-brand-900 placeholder:text-brand-400 focus:border-action-500 focus:outline-none"
        />
      </div>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save health record"}
      </Button>
    </form>
  );
}
