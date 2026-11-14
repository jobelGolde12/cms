"use client";

import { useActionState, useMemo, useState } from "react";
import { createStudent, updateStudent } from "@/actions/students";
import type { ActionState } from "@/actions/helpers";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useFormResetGuard } from "@/components/ui/form-reset-guard";
import {
  SectionPickerFields,
  useEnrollmentSelection,
  type EnrollmentOptions,
} from "@/components/students/section-picker";
import { SEXES } from "@/lib/constants";
import {
  birthDateError,
  birthDateMax,
  birthDateMin,
  emailError,
  liveFieldErrors,
  nameError,
  phoneError,
  sanitizePhoneInput,
} from "./student-form-validation";

export type StudentFormDefaults = {
  id?: string;
  studentNumber?: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  suffix?: string | null;
  lrn?: string | null;
  birthDate?: string;
  sex?: string;
  contactNumber?: string | null;
  address?: string | null;
  guardianFirstName?: string | null;
  guardianMiddleName?: string | null;
  guardianLastName?: string | null;
  guardianRelationship?: string | null;
  guardianContactNumber?: string | null;
  guardianEmail?: string | null;
};

/** Header-only rendering for dialog mode (no boxed sections). */
function FormSectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <>
      <h2 className="text-sm font-semibold text-brand-900">{title}</h2>
      {hint ? <p className="mt-1 text-xs text-[#64748B]">{hint}</p> : null}
    </>
  );
}

/** Thin divider used between unboxed groups in dialog mode. */
function FormSectionDivider() {
  return <hr className="border-brand-200" />;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  mother: "Mother",
  father: "Father",
  guardian: "Guardian",
};

type SourceOfTruth = Record<string, string | undefined>;

const EMPTY_ENROLLMENT_OPTIONS: EnrollmentOptions = {
  schoolYears: [],
  gradeLevels: [],
  sections: [],
};

export function StudentForm({
  defaults = {},
  mode,
  onSuccess,
  compact = false,
  enrollmentOptions,
  enrollmentRequired = false,
}: {
  defaults?: StudentFormDefaults;
  mode: "create" | "edit";
  /** Called after a successful create/update — lets the modal close itself. */
  onSuccess?: (studentId: string, message: string | undefined) => void;
  /** Toggles the more spacious page-only section scaffolding off for dialog use. */
  compact?: boolean;
  /**
   * Sections the account may enroll a new student into. Supplied only on the
   * CREATE form for roles holding `enrollment.manage`; an Adviser receives just
   * their own sections. The placement is re-validated server-side.
   */
  enrollmentOptions?: EnrollmentOptions;
  /** True for an Adviser: a new student must be enrolled into an advised section. */
  enrollmentRequired?: boolean;
}) {
  const action = mode === "create" ? createStudent : updateStudent;
  const initial: ActionState = { ok: false, error: "" };
  const showEnrollment = mode === "create" && Boolean(enrollmentOptions);
  const enrollmentController = useEnrollmentSelection(
    enrollmentOptions ?? EMPTY_ENROLLMENT_OPTIONS,
  );

  // ------------------------------------------------------------------ //
  //  Realtime validation state (touched-based to avoid shouting early)  //
  // ------------------------------------------------------------------ //
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const initialValues = (): SourceOfTruth => ({
    firstName: defaults.firstName ?? "",
    lastName: defaults.lastName ?? "",
    birthDate: defaults.birthDate ?? "",
    contactNumber: defaults.contactNumber ?? "",
    guardianFirstName: defaults.guardianFirstName ?? "",
    guardianLastName: defaults.guardianLastName ?? "",
    guardianContactNumber: defaults.guardianContactNumber ?? "",
    guardianEmail: defaults.guardianEmail ?? "",
  });
  const [values, setValues] = useState<SourceOfTruth>(initialValues);

  // React 19 resets the form as soon as the action starts; cancelling that
  // reset keeps the typed values when the server rejects the submission.
  const { formRef, onReset, resetNow } = useFormResetGuard();

  // The action wrapper owns every post-submit side effect: the modal wrapper
  // is notified on success, and page mode starts a clean form. Doing this
  // inside the action (instead of an effect) keeps the reset tied to the
  // submission that caused it.
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData): Promise<ActionState> => {
      const result = await action(prev, formData);
      if (result.ok) {
        if (onSuccess) {
          const id = typeof result.redirectTo === "string" ? result.redirectTo.replace("/students/", "") : "";
          onSuccess(id, result.message);
        } else {
          resetNow();
          setValues(initialValues());
          setTouched({});
        }
      }
      return result;
    },
    initial,
  );

  const err = (key: string): string | undefined =>
    state.ok === false ? state.fieldErrors?.[key] : undefined;

  const live = useMemo(
    () =>
      liveFieldErrors({
        firstName: values.firstName ?? "",
        lastName: values.lastName ?? "",
        birthDate: values.birthDate ?? "",
        contactNumber: values.contactNumber ?? "",
        guardianFirstName: values.guardianFirstName ?? "",
        guardianLastName: values.guardianLastName ?? "",
        guardianContactNumber: values.guardianContactNumber ?? "",
        guardianEmail: values.guardianEmail ?? "",
      }),
    [values],
  );

  const touch = (key: string) => setTouched((t) => ({ ...t, [key]: true }));

  const setValue = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const setPhone = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = sanitizePhoneInput(e.target.value);
    setValues((v) => ({ ...v, [key]: e.target.value }));
  };

  /** Server-side error wins while pending; once resolved, live takes over. */
  const mergedError = (key: string): string | undefined => {
    const server = err(key);
    if (server) return server;
    if (state.ok === true || pending) return undefined;
    const liveError = live[key] ?? null;
    if (live[key] !== undefined && touched[key]) return liveError ?? undefined;
    return undefined;
  };

  // Broadcast success to the modal wrapper (closes itself).
  // Page mode (no modal wrapper): start a clean form after a successful save.

  const isDialog = Boolean(onSuccess) || compact;

  const body = (
    <form ref={formRef} action={formAction} onReset={onReset} className="space-y-5" noValidate>
      {mode === "edit" ? (
        <input type="hidden" name="studentId" value={defaults.id ?? ""} />
      ) : null}

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
          className="rounded-lg border border-emerald-200 bg-status-verified-bg px-3 py-2.5 text-sm font-medium text-status-verified transition-opacity duration-300 animate-[fadeIn_300ms_ease-in]"
        >
          {state.message}
        </div>
      ) : null}

      {/* Basic information */}
      {isDialog ? null : <FormSectionHeader title="Basic Information" />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="firstName" required error={mergedError("firstName")}>
          <Input
            id="firstName"
            name="firstName"
            value={values.firstName}
            onChange={setValue("firstName")}
            onBlur={() => touch("firstName")}
            required
            maxLength={60}
            autoComplete="given-name"
            aria-invalid={Boolean(mergedError("firstName"))}
          />
        </Field>
        <Field label="Middle name" htmlFor="middleName" error={err("middleName")}>
          <Input id="middleName" name="middleName" defaultValue={defaults.middleName ?? ""} maxLength={60} />
        </Field>
        <Field label="Last name" htmlFor="lastName" required error={mergedError("lastName")}>
          <Input
            id="lastName"
            name="lastName"
            value={values.lastName}
            onChange={setValue("lastName")}
            onBlur={() => touch("lastName")}
            required
            maxLength={60}
            autoComplete="family-name"
            aria-invalid={Boolean(mergedError("lastName"))}
          />
        </Field>
        <Field label="Suffix" htmlFor="suffix" error={err("suffix")}>
          <Input id="suffix" name="suffix" defaultValue={defaults.suffix ?? ""} maxLength={10} placeholder="Jr., III…" />
        </Field>
        <Field
          label="LRN"
          htmlFor="lrn"
          error={err("lrn")}
          hint="DepEd Learner Reference Number — 12 digits, exactly as issued."
        >
          <Input
            id="lrn"
            name="lrn"
            defaultValue={defaults.lrn ?? ""}
            inputMode="numeric"
            maxLength={12}
            aria-invalid={Boolean(err("lrn"))}
          />
        </Field>
        <Field
          label="Birth date"
          htmlFor="birthDate"
          error={mergedError("birthDate")}
          hint="Optional when the source lacks it (unknown from imported rosters). Age 9–24 for high school records; today at most."
        >
          <Input
            id="birthDate"
            name="birthDate"
            type="date"
            min={birthDateMin()}
            max={birthDateMax()}
            value={values.birthDate}
            onChange={setValue("birthDate")}
            onBlur={() => touch("birthDate")}
            aria-invalid={Boolean(mergedError("birthDate"))}
          />
        </Field>
        <Field label="Sex" htmlFor="sex" required error={err("sex")}>
          <Select id="sex" name="sex" defaultValue={defaults.sex ?? ""} required>
            <option value="" disabled>Select…</option>
            {SEXES.map((s) => (
              <option key={s} value={s}>{s === "male" ? "Male" : "Female"}</option>
            ))}
          </Select>
        </Field>
      </div>
      {!isDialog ? <FormSectionDivider /> : null}

      {/* Contact */}
      {isDialog ? null : <FormSectionHeader title="Contact & Address" />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Contact number"
          htmlFor="contactNumber"
          error={mergedError("contactNumber")}
          hint="PH format — 09xx xxx xxxx or +63 9xx xxx xxxx."
        >
          <Input
            id="contactNumber"
            name="contactNumber"
            value={values.contactNumber}
            onChange={setPhone("contactNumber")}
            onBlur={() => touch("contactNumber")}
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            placeholder="0917 000 0000"
            aria-invalid={Boolean(mergedError("contactNumber"))}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Address" htmlFor="address" error={err("address")}>
            <Textarea id="address" name="address" defaultValue={defaults.address ?? ""} maxLength={300} />
          </Field>
        </div>
      </div>
      {!isDialog ? <FormSectionDivider /> : null}

      {/* Primary guardian */}
      {isDialog ? null : (
        <>
          <FormSectionHeader
            title="Primary Guardian"
            hint="Optional when creating the record; a guardian can be added later."
          />
        </>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="First name"
          htmlFor="guardianFirstName"
          required={Boolean(values.guardianFirstName || values.guardianLastName || values.guardianContactNumber || values.guardianEmail)}
          error={mergedError("guardianFirstName") ?? (touched.guardianFirstName ? live.guardianRequired ?? undefined : undefined)}
        >
          <Input
            id="guardianFirstName"
            name="guardianFirstName"
            value={values.guardianFirstName}
            onChange={setValue("guardianFirstName")}
            onBlur={() => touch("guardianFirstName")}
            maxLength={60}
            autoComplete="off"
            aria-invalid={Boolean(mergedError("guardianFirstName") || (touched.guardianFirstName && live.guardianRequired))}
          />
        </Field>
        <Field label="Middle name" htmlFor="guardianMiddleName">
          <Input id="guardianMiddleName" name="guardianMiddleName" defaultValue={defaults.guardianMiddleName ?? ""} maxLength={60} />
        </Field>
        <Field
          label="Last name"
          htmlFor="guardianLastName"
          required={Boolean(values.guardianFirstName || values.guardianLastName || values.guardianContactNumber || values.guardianEmail)}
          error={mergedError("guardianLastName")}
        >
          <Input
            id="guardianLastName"
            name="guardianLastName"
            value={values.guardianLastName}
            onChange={setValue("guardianLastName")}
            onBlur={() => touch("guardianLastName")}
            maxLength={60}
            autoComplete="off"
            aria-invalid={Boolean(mergedError("guardianLastName"))}
          />
        </Field>
        <Field label="Relationship" htmlFor="guardianRelationship" error={err("guardianRelationship")}>
          <Select id="guardianRelationship" name="guardianRelationship" defaultValue={defaults.guardianRelationship ?? ""} onBlur={() => touch("guardianRelationship")}>
            <option value="">Select…</option>
            {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </Field>
        <Field
          label="Contact number"
          htmlFor="guardianContactNumber"
          error={mergedError("guardianContactNumber")}
          hint="PH format — 09xx xxx xxxx or +63 9xx xxx xxxx."
        >
          <Input
            id="guardianContactNumber"
            name="guardianContactNumber"
            value={values.guardianContactNumber}
            onChange={setPhone("guardianContactNumber")}
            onBlur={() => touch("guardianContactNumber")}
            inputMode="tel"
            maxLength={20}
            aria-invalid={Boolean(mergedError("guardianContactNumber"))}
          />
        </Field>
        <Field label="Email" htmlFor="guardianEmail" error={mergedError("guardianEmail")}>
          <Input
            id="guardianEmail"
            name="guardianEmail"
            type="email"
            value={values.guardianEmail}
            onChange={setValue("guardianEmail")}
            onBlur={() => touch("guardianEmail")}
            maxLength={120}
            aria-invalid={Boolean(mergedError("guardianEmail"))}
          />
        </Field>
      </div>

      {/* Enrollment — shown on create for roles that may enroll a student. */}
      {showEnrollment ? (
        <>
          {!isDialog ? <FormSectionDivider /> : null}
          {isDialog ? null : (
            <FormSectionHeader
              title="Enrollment"
              hint="Place the student in a school year, grade level and section."
            />
          )}
          <div className="rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-3 sm:px-4">
            <SectionPickerFields
              controller={enrollmentController}
              idPrefix="create-enrollment"
              required={enrollmentRequired}
              errors={state.ok === false ? state.fieldErrors : undefined}
            />
            {enrollmentRequired ? (
              <p className="mt-2 text-xs text-[#64748B]">
                You can enroll the student only into a section you advise. A
                subject-teacher load does not grant enrollment rights.
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      {/* Submit */}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="intent" value="draft" variant="outline" size="md" disabled={pending}>
          {pending ? "Saving…" : "Save draft"}
        </Button>
        <Button type="submit" name="intent" value="submit" size="md" disabled={pending}>
          {pending ? "Submitting…" : mode === "create" ? "Save & submit for verification" : "Save & resubmit"}
        </Button>
      </div>
      {!isDialog ? <LiveSummary live={live} /> : null}
    </form>
  );

  if (!isDialog) {
    return (
      <div className="space-y-5">
        {body}
      </div>
    );
  }

  return body;
}

/** Compact hint row (page mode only) telling the user which live checks are failing. */
function LiveSummary({ live }: { live: Record<string, string | null> }) {
  const problems = Object.entries(live)
    .filter(([, v]) => Boolean(v))
    .map(([, v]) => v as string);
  if (problems.length === 0) return null;
  return (
    <div role="status" className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-700">
      {problems.length} live check question{problems.length === 1 ? "" : "s"} — they will be re-checked on submit.
      <ul className="mt-1 list-inside list-disc">
        {problems.slice(0, 3).map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

export { birthDateError, emailError, nameError, phoneError };
