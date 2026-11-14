"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { saveEnrollment } from "@/actions/records";
import type { ActionState } from "@/actions/helpers";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useFormResetGuard } from "@/components/ui/form-reset-guard";
import {
  ENROLLMENT_STATUSES,
  ENROLLMENT_STATUS_LABELS,
  type EnrollmentStatus,
} from "@/lib/constants";
import { reassignmentNotice } from "@/lib/enrollment-rules";
import {
  SectionPickerFields,
  useEnrollmentSelection,
  type EnrollmentOptions,
} from "./section-picker";

export type EnrollmentRow = {
  id: string;
  status: string;
  enrollmentDate: string | null;
  schoolYearId: string;
  schoolYear: string;
  gradeLevelId: string;
  gradeLevelName: string;
  sectionId: string;
  sectionName: string;
};

/**
 * Create/update a student's enrollment (the Student → SY → Grade → Section
 * relationship). The dropdowns only ever show the sections the server handed
 * this account, and the same placement + scope is re-validated in
 * `saveEnrollment` — the client is never the security boundary.
 */
export function EnrollmentForm({
  studentId,
  options,
  enrollments,
  defaultSchoolYearId,
}: {
  studentId: string;
  options: EnrollmentOptions;
  enrollments: EnrollmentRow[];
  defaultSchoolYearId?: string;
}) {
  const router = useRouter();
  const active = enrollments.find((e) => e.status === "active") ?? enrollments[0] ?? null;

  const initial: ActionState = { ok: false, error: "" };
  const { formRef, onReset } = useFormResetGuard();
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData): Promise<ActionState> => {
      const result = await saveEnrollment(prev, formData);
      if (result.ok) router.refresh();
      return result;
    },
    initial,
  );

  const controller = useEnrollmentSelection(options, {
    schoolYearId: active?.schoolYearId ?? defaultSchoolYearId,
    gradeLevelId: active?.gradeLevelId,
    sectionId: active?.sectionId,
  });

  const { value } = controller;
  const existingForYear = enrollments.find((e) => e.schoolYearId === value.schoolYearId) ?? null;
  const errors = state.ok === false ? state.fieldErrors : undefined;

  return (
    <form ref={formRef} action={formAction} onReset={onReset} className="space-y-4" noValidate>
      <input type="hidden" name="studentId" value={studentId} />

      {state.ok === false && state.error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-status-error-bg px-3 py-2 text-sm font-medium text-red-800"
        >
          {state.error}
        </div>
      ) : null}
      {state.ok === true && state.message ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-status-verified-bg px-3 py-2.5 text-sm font-medium text-status-verified"
        >
          {state.message}
        </div>
      ) : null}

      {existingForYear ? (
        <div
          role="note"
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900"
        >
          {reassignmentNotice(
            existingForYear.schoolYear,
            existingForYear.gradeLevelName,
            existingForYear.sectionName,
          )}
        </div>
      ) : null}

      <SectionPickerFields
        controller={controller}
        idPrefix="enrollment"
        required
        errors={errors}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Status" htmlFor="enrollment-status" required error={errors?.status}>
          <Select
            id="enrollment-status"
            name="status"
            defaultValue={(active?.status as EnrollmentStatus) ?? "active"}
            required
          >
            {ENROLLMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ENROLLMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Enrollment date"
          htmlFor="enrollment-date"
          error={errors?.enrollmentDate}
          hint="Optional — defaults to today when left blank."
        >
          <Input
            id="enrollment-date"
            name="enrollmentDate"
            type="date"
            defaultValue={active?.enrollmentDate ?? ""}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : existingForYear ? "Update enrollment" : "Save enrollment"}
        </Button>
      </div>
    </form>
  );
}
