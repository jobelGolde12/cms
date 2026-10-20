"use client";

import { useActionState } from "react";
import { saveClinicalRecord } from "@/actions/health";
import { Button } from "@/components/ui/button";
import { HEALTH_SEED_CATEGORIES } from "@/lib/constants";

/**
 * Clinical record form (Nurse). The server action re-validates permissions,
 * scope, and required fields — client validation is UX only, never the guard.
 */
export function ClinicalRecordForm({ studentId }: { studentId: string }) {
  const [state, formAction, pending] = useActionState(saveClinicalRecord, {
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
            htmlFor="clinical-date"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"
          >
            Date
          </label>
          <input
            id="clinical-date"
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="clinical-category"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"
          >
            Category
          </label>
          <input
            id="clinical-category"
            name="category"
            list="clinical-category-presets"
            required
            maxLength={60}
            className="w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none"
          />
          <datalist id="clinical-category-presets">
            {HEALTH_SEED_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      <div>
        <label
          htmlFor="clinical-description"
          className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"
        >
          Description
        </label>
        <textarea
          id="clinical-description"
          name="description"
          rows={2}
          required
          maxLength={500}
          placeholder="What happened / what was observed…"
          className="w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-[13px] text-brand-900 placeholder:text-brand-400 focus:border-action-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="clinical-assessment"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"
          >
            Assessment / observation
          </label>
          <input
            id="clinical-assessment"
            name="assessment"
            maxLength={300}
            className="w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="clinical-action"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"
          >
            Action taken
          </label>
          <input
            id="clinical-action"
            name="actionTaken"
            maxLength={300}
            className="w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="clinical-remarks"
          className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"
        >
          Remarks (optional)
        </label>
        <input
          id="clinical-remarks"
          name="remarks"
          maxLength={300}
          className="w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none"
        />
      </div>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save clinical record"}
      </Button>
    </form>
  );
}
