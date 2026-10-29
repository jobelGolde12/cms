"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { saveGuidanceIncident } from "@/actions/guidance";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { BEHAVIOR_SEVERITIES, BEHAVIOR_RECORD_STATUSES } from "@/lib/constants";

const SEVERITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  monitored: "Monitored",
  resolved: "Resolved",
};

export type IncidentFormValues = {
  id?: string;
  categoryId: string;
  date: string;
  description: string;
  severity: string;
  followUp: string;
  status: string;
};

/**
 * Guidance Office incident form. The server action re-validates permissions,
 * roster integrity, and the incident-type vocabulary — this client form only
 * mirrors the same validation for early feedback.
 */
export function IncidentForm({
  studentId,
  studentName,
  studentNumber,
  sectionLabel,
  categories,
  initial,
}: {
  studentId: string;
  studentName: string;
  studentNumber: string;
  sectionLabel: string;
  /** concern-kind behavior categories (incident types are data rows). */
  categories: { id: string; name: string }[];
  initial?: Partial<IncidentFormValues>;
}) {
  const [state, formAction, pending] = useActionState(saveGuidanceIncident, {
    ok: false as const,
    error: "",
  });
  const router = useRouter();
  const editing = Boolean(initial?.id);

  // Return to the incident list once the record is saved (feedback flashes
  // through the success chip on the list header).
  useEffect(() => {
    if (state.ok) {
      router.push("/guidance");
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <form action={formAction} className="space-y-4">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="studentId" value={studentId} />

      {state.ok === false && state.error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </p>
      ) : null}

      {/* Student stamp — chosen from registry records, never free-typed. */}
      <div className="rounded-lg border border-brand-200 bg-brand-50/60 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-400">Student</p>
        <p className="mt-1 text-sm font-semibold text-brand-900">
          <span className="numeric text-xs font-semibold text-[#64748B]">{studentNumber}</span>
          <span className="ml-2">{studentName}</span>
        </p>
        <p className="text-xs text-[#64748B]">Section: {sectionLabel}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Incident type"
          htmlFor="incident-type"
          required
          error={state.ok === false ? state.fieldErrors?.["categoryId"] : undefined}
        >
          <select
            id="incident-type"
            name="categoryId"
            required
            defaultValue={initial?.categoryId ?? ""}
            className="h-11 w-full rounded-lg border border-brand-300 bg-white px-3 text-brand-950 focus:border-action-600"
          >
            <option value="">Select an incident type…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Date of incident"
          htmlFor="incident-date"
          required
          error={state.ok === false ? state.fieldErrors?.["date"] : undefined}
        >
          <input
            id="incident-date"
            name="date"
            type="date"
            required
            defaultValue={initial?.date ?? new Date().toISOString().slice(0, 10)}
            className="h-11 w-full rounded-lg border border-brand-300 bg-white px-3 text-brand-950 focus:border-action-600"
          />
        </Field>
        <Field
          label="Severity (optional)"
          htmlFor="incident-severity"
          error={state.ok === false ? state.fieldErrors?.["severity"] : undefined}
        >
          <select
            id="incident-severity"
            name="severity"
            defaultValue={initial?.severity ?? ""}
            className="h-11 w-full rounded-lg border border-brand-300 bg-white px-3 text-brand-950 focus:border-action-600"
          >
            <option value="">Not set</option>
            {BEHAVIOR_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Status"
          htmlFor="incident-status"
          error={state.ok === false ? state.fieldErrors?.["status"] : undefined}
        >
          <select
            id="incident-status"
            name="status"
            defaultValue={initial?.status ?? "open"}
            className="h-11 w-full rounded-lg border border-brand-300 bg-white px-3 text-brand-950 focus:border-action-600"
          >
            {BEHAVIOR_RECORD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Incident (what happened)"
        htmlFor="incident-description"
        required
        hint="Describe the incident factually — visible only to the Guidance Office and the administration."
        error={state.ok === false ? state.fieldErrors?.["description"] : undefined}
      >
        <textarea
          id="incident-description"
          name="description"
          rows={4}
          required
          maxLength={500}
          defaultValue={initial?.description ?? ""}
          className="min-h-[96px] w-full rounded-lg border border-brand-300 bg-white px-3 py-2 text-brand-950 focus:border-action-600"
        />
      </Field>

      <Field
        label="Intervention (action taken)"
        htmlFor="incident-intervention"
        hint="Counseling session, parent conference, referral, sanctions, etc."
        error={state.ok === false ? state.fieldErrors?.["followUp"] : undefined}
      >
        <textarea
          id="incident-intervention"
          name="followUp"
          rows={3}
          maxLength={300}
          defaultValue={initial?.followUp ?? ""}
          className="min-h-[88px] w-full rounded-lg border border-brand-300 bg-white px-3 py-2 text-brand-950 focus:border-action-600"
        />
      </Field>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save changes" : "Record incident"}
        </Button>
        <button
          type="button"
          onClick={() => router.push("/guidance")}
          className="text-xs font-medium text-[#64748B] transition-colors hover:text-brand-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
