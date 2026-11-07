"use client";

import { useActionState, useEffect, useState } from "react";
import { createEmployee, updateEmployee } from "@/actions/employees";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useFormResetGuard } from "@/components/ui/form-reset-guard";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  CIVIL_STATUSES,
  CIVIL_STATUS_LABELS,
  EMPLOYEE_POSITIONS,
  EMPLOYEE_POSITION_LABELS,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  SEXES,
} from "@/lib/constants";
import type { Employee } from "@/db/schema";
import type { ActionState } from "@/actions/helpers";
import type { SectionOption } from "@/components/sections/section-dialog";
import type { AccountOption, SubjectOption, TeachingLoad } from "@/lib/teaching-loads";

/**
 * String snapshot of a submitted FormData — echoed back inside the failed
 * ActionState so uncontrolled fields can restore the user's own values as
 * defaults (React 19 otherwise resets them to their initial defaults after
 * every completed action, including failed ones).
 */
function submittedValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !(key in out)) out[key] = value;
  }
  return out;
}

/**
 * Create/edit form for employee records. The employee number is generated
 * server-side when left blank, so the field is optional and clearly hinted.
 *
 * Error paths never clear input: the wrapper action snapshots the submitted
 * values before the server call and merges them into every failed result; the
 * form then renders those values as the uncontrolled fields' defaults, so the
 * post-action reset re-applies the user's typed data (see submittedValues).
 */
export function EmployeeForm({
  employee,
  mode,
  sectionOptions = [],
  accountOptions = [],
  subjectOptions = [],
  initialTeachingLoads = [],
  onSuccess,
}: {
  employee?: Employee;
  mode: "create" | "edit";
  /** Active sections (label "Grade X — Section"), for the adviser assignment. */
  sectionOptions?: SectionOption[];
  /** Active Subject Teacher login accounts that can be linked to this record. */
  accountOptions?: AccountOption[];
  /** Active subjects, for the grade-encoding teaching loads. */
  subjectOptions?: SubjectOption[];
  /** Teaching loads the linked account already carries. */
  initialTeachingLoads?: TeachingLoad[];
  onSuccess?: () => void;
}) {
  const action = mode === "create" ? createEmployee : updateEmployee;
  const initial: ActionState = { ok: false, error: "" };
  const { formRef, onReset } = useFormResetGuard();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
    // Snapshot before the server call so even client-side aborts/failures can
    // restore what the user typed.
    const submitted = submittedValues(formData);
    const result = await action(prev, formData);
    if (result.ok) {
      if (onSuccess) onSuccess();
      return result;
    }
      // Preserve the user's input through validation/server/database failures.
      return { ...result, values: submitted };
    },
    initial,
  );

  /** The values submitted with the failed attempt (when one exists). */
  const failedWith = state.ok === false ? state.values : undefined;
  /** Default value: the user's submitted value after a failure, otherwise
   *  the stored employee value (edit) or blank (create). */
  const val = (key: string, fallback: string | null | undefined = ""): string =>
    (failedWith && failedWith[key] !== undefined ? failedWith[key] : (fallback ?? ""));

  // Focus the first invalid field after a failed submission so the user can
  // correct it without hunting through the form.
  useEffect(() => {
    if (state.ok !== false || !state.fieldErrors || Object.keys(state.fieldErrors).length === 0) {
      return;
    }
    const firstInvalid = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
    if (firstInvalid) firstInvalid.focus();
  }, [state, formRef]);

  const [positionKey, setPositionKey] = useState<string>(() => {
    const stored = employee?.position ?? "";
    if (!stored) return "";
    return (EMPLOYEE_POSITIONS as readonly string[]).includes(stored) ? stored : "other";
  });
  const legacyOtherPosition =
    employee?.position && !(EMPLOYEE_POSITIONS as readonly string[]).includes(employee.position)
      ? employee.position
      : "";
  const [otherPosition, setOtherPosition] = useState<string>(legacyOtherPosition);
  // A teacher may carry both responsibilities on one personnel record.
  const isAdviser =
    positionKey === "adviser" || positionKey === "adviser_subject_teacher";
  const isOther = positionKey === "other";
  const isSubjectTeacher =
    positionKey === "subject_teacher" || positionKey === "adviser_subject_teacher";

  // Grade-encoding scope: the (section, subject) teaching loads of the
  // linked Subject Teacher account.
  const [loads, setLoads] = useState<TeachingLoad[]>(initialTeachingLoads);
  const [loadSection, setLoadSection] = useState("");
  const [loadSubject, setLoadSubject] = useState("");

  const sectionLabel = (id: string) =>
    sectionOptions.find((o) => o.id === id)?.label ?? id;
  const subjectLabel = (id: string) =>
    subjectOptions.find((o) => o.id === id)?.label ?? id;

  const addLoad = () => {
    if (!loadSection || !loadSubject) return;
    setLoads((current) =>
      current.some((l) => l.sectionId === loadSection && l.subjectId === loadSubject)
        ? current
        : [...current, { sectionId: loadSection, subjectId: loadSubject }],
    );
    setLoadSection("");
    setLoadSubject("");
  };

  const removeLoad = (sectionId: string, subjectId: string) =>
    setLoads((current) =>
      current.filter((l) => !(l.sectionId === sectionId && l.subjectId === subjectId)),
    );

  const err = (key: string): string | undefined =>
    state.ok === false ? state.fieldErrors?.[key] : undefined;

  return (
    <form ref={formRef} action={formAction} onReset={onReset} className="space-y-5" noValidate>
      {mode === "edit" ? <input type="hidden" name="employeeId" value={employee?.id ?? ""} /> : null}

      {state.ok === false && state.error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800"
        >
          {state.error}
        </div>
      ) : null}
      {state.ok === true && state.message ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800"
        >
          {state.message}
        </div>
      ) : null}

      {/* Personal information */}
      <div>
        <h3 className="text-sm font-semibold text-brand-900">Personal Information</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Employee number" htmlFor="employeeNumber" error={err("employeeNumber")} hint="Leave blank to auto-generate (EMP-YYYY-######).">
            <Input
              id="employeeNumber"
              name="employeeNumber"
              defaultValue={val("employeeNumber", employee?.employeeNumber)}
              maxLength={30}
              placeholder="Auto"
            />
          </Field>
          <Field label="Sex" htmlFor="employee-sex" required error={err("sex")}>
            <Select id="employee-sex" name="sex" defaultValue={val("sex", employee?.sex)} required>
              <option value="" disabled>
                Select…
              </option>
              {SEXES.map((s) => (
                <option key={s} value={s}>
                  {s === "male" ? "Male" : "Female"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="First name" htmlFor="employee-firstName" required error={err("firstName")}>
            <Input id="employee-firstName" name="firstName" defaultValue={val("firstName", employee?.firstName)} required maxLength={60} autoComplete="given-name" />
          </Field>
          <Field label="Middle name" htmlFor="employee-middleName" error={err("middleName")}>
            <Input id="employee-middleName" name="middleName" defaultValue={val("middleName", employee?.middleName)} maxLength={60} />
          </Field>
          <Field label="Last name" htmlFor="employee-lastName" required error={err("lastName")}>
            <Input id="employee-lastName" name="lastName" defaultValue={val("lastName", employee?.lastName)} required maxLength={60} autoComplete="family-name" />
          </Field>
          <Field label="Suffix" htmlFor="employee-suffix" error={err("suffix")}>
            <Input id="employee-suffix" name="suffix" defaultValue={val("suffix", employee?.suffix)} maxLength={10} placeholder="Jr., III…" />
          </Field>
          <Field label="Birth date" htmlFor="employee-birthDate" error={err("birthDate")}>
            <Input id="employee-birthDate" name="birthDate" type="date" defaultValue={val("birthDate", employee?.birthDate)} />
          </Field>
          <Field label="Civil status" htmlFor="employee-civilStatus" error={err("civilStatus")}>
            <Select id="employee-civilStatus" name="civilStatus" defaultValue={val("civilStatus", employee?.civilStatus)}>
              <option value="">Select…</option>
              {CIVIL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CIVIL_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Contact number" htmlFor="employee-contactNumber" error={err("contactNumber")} hint="PH format — 0917 123 4567.">
            <Input id="employee-contactNumber" name="contactNumber" defaultValue={val("contactNumber", employee?.contactNumber)} inputMode="tel" maxLength={20} />
          </Field>
          <Field label="Email" htmlFor="employee-email" error={err("email")}>
            <Input id="employee-email" name="email" type="email" defaultValue={val("email", employee?.email)} maxLength={120} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address" htmlFor="employee-address" error={err("address")}>
              <Textarea id="employee-address" name="address" defaultValue={val("address", employee?.address)} maxLength={300} />
            </Field>
          </div>
          <Field label="Emergency contact name" htmlFor="employee-ecName" error={err("emergencyContactName")}>
            <Input id="employee-ecName" name="emergencyContactName" defaultValue={val("emergencyContactName", employee?.emergencyContactName)} maxLength={120} />
          </Field>
          <Field label="Emergency contact relation" htmlFor="employee-ecRelation" error={err("emergencyContactRelation")}>
            <Input id="employee-ecRelation" name="emergencyContactRelation" defaultValue={val("emergencyContactRelation", employee?.emergencyContactRelation)} maxLength={40} placeholder="Spouse, parent…" />
          </Field>
          <Field label="Emergency contact number" htmlFor="employee-ecNumber" error={err("emergencyContactNumber")}>
            <Input id="employee-ecNumber" name="emergencyContactNumber" defaultValue={val("emergencyContactNumber", employee?.emergencyContactNumber)} inputMode="tel" maxLength={20} />
          </Field>
        </div>
      </div>

      {/* Employment information */}
      <div className="border-t border-brand-200 pt-4">
        <h3 className="text-sm font-semibold text-brand-900">Employment Information</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Position" htmlFor="employee-position" error={err("position")}>
            <Select
              id="employee-position"
              name="position"
              value={positionKey}
              onChange={(e) => {
                setPositionKey(e.target.value);
                if (e.target.value !== "other") setOtherPosition("");
              }}
            >
              <option value="">
                Select position…
              </option>
              {EMPLOYEE_POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {EMPLOYEE_POSITION_LABELS[p]}
                </option>
              ))}
            </Select>
          </Field>
          {isOther ? (
            <Field
              label="Position (specify)"
              htmlFor="employee-otherPosition"
              error={err("otherPosition")}
              hint="Required when “Other” — describe the school position."
            >
              <Input
                id="employee-otherPosition"
                name="otherPosition"
                value={otherPosition}
                onChange={(e) => setOtherPosition(e.target.value)}
                maxLength={120}
                placeholder="Teacher I, School Nurse…"
              />
            </Field>
          ) : null}
          {isAdviser ? (
            <Field
              label="Assigned section"
              htmlFor="employee-assignedSection"
              error={err("assignedSectionId")}
              hint="Referenced from Sections management — validated server-side"
            >
              <Select
                id="employee-assignedSection"
                name="assignedSectionId"
                defaultValue={val("assignedSectionId", employee?.assignedSectionId)}
              >
                <option value="">No section assigned yet</option>
                {sectionOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {isSubjectTeacher ? (
            <Field
              label="Login account"
              htmlFor="employee-userId"
              error={err("userId")}
              hint="Links the personnel record to the account that carries the grade-encoding loads. The account may hold the Subject Teacher role as its primary or an additional role."
            >
              <Select
                id="employee-userId"
                name="userId"
                defaultValue={val("userId", employee?.userId)}
              >
                <option value="">No account linked</option>
                {accountOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label} ({o.email})
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="Designation" htmlFor="employee-designation" error={err("designation")}>
            <Input id="employee-designation" name="designation" defaultValue={val("designation", employee?.designation)} maxLength={120} />
          </Field>
          <Field label="Appointment status" htmlFor="employee-appointmentStatus" error={err("appointmentStatus")}>
            <Select id="employee-appointmentStatus" name="appointmentStatus" defaultValue={val("appointmentStatus", employee?.appointmentStatus)}>
              <option value="">Select…</option>
              {APPOINTMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {APPOINTMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Employment type" htmlFor="employee-employmentType" error={err("employmentType")}>
            <Select id="employee-employmentType" name="employmentType" defaultValue={val("employmentType", employee?.employmentType)}>
              <option value="">Select…</option>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EMPLOYMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Department / office" htmlFor="employee-department" error={err("department")}>
            <Input id="employee-department" name="department" defaultValue={val("department", employee?.department)} maxLength={120} />
          </Field>
          <Field label="Date hired" htmlFor="employee-dateHired" error={err("dateHired")}>
            <Input id="employee-dateHired" type="date" name="dateHired" defaultValue={val("dateHired", employee?.dateHired)} />
          </Field>
          <Field label="Date of appointment" htmlFor="employee-dateAppointment" error={err("dateOfAppointment")}>
            <Input id="employee-dateAppointment" type="date" name="dateOfAppointment" defaultValue={val("dateOfAppointment", employee?.dateOfAppointment)} />
          </Field>
          <Field label="Salary grade" htmlFor="employee-salaryGrade" error={err("salaryGrade")}>
            <Input id="employee-salaryGrade" name="salaryGrade" defaultValue={val("salaryGrade", employee?.salaryGrade)} maxLength={20} placeholder="SG-11" />
          </Field>
          <Field label="Step" htmlFor="employee-step" error={err("step")}>
            <Input id="employee-step" name="step" defaultValue={val("step", employee?.step)} maxLength={20} placeholder="Step 1" />
          </Field>
        </div>
      </div>

      {/* Grade-encoding scope — a Subject Teacher (or Adviser + Subject Teacher) holds loads. */}
      {isSubjectTeacher ? (
        <div className="border-t border-brand-200 pt-4">
          <h3 className="text-sm font-semibold text-brand-900">Grade Encoding Scope</h3>
          <p className="mt-1 text-xs text-[#64748B]">
            Teaching loads define the (section, subject) pairs this teacher may encode grades
            for. The scope is enforced server-side on every grade write.
          </p>

          {err("teachingLoad") ? (
            <p role="alert" className="mt-2 text-xs font-medium text-red-700">
              {err("teachingLoad")}
            </p>
          ) : null}

          {/* The submitted pairs — one hidden field per load. */}
          {loads.map((load) => (
            <input
              key={`${load.sectionId}|${load.subjectId}`}
              type="hidden"
              name="teachingLoad"
              value={`${load.sectionId}|${load.subjectId}`}
            />
          ))}

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[2fr_2fr_auto] sm:items-end">
            <Field label="Section" htmlFor="load-section">
              <Select
                id="load-section"
                value={loadSection}
                onChange={(e) => setLoadSection(e.target.value)}
              >
                <option value="">Select section…</option>
                {sectionOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subject" htmlFor="load-subject">
              <Select
                id="load-subject"
                value={loadSubject}
                onChange={(e) => setLoadSubject(e.target.value)}
              >
                <option value="">Select subject…</option>
                {subjectOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="button" variant="secondary" onClick={addLoad} disabled={!loadSection || !loadSubject}>
              Add load
            </Button>
          </div>

          {loads.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-brand-200 px-3 py-2 text-xs text-[#64748B]">
              No teaching load yet — this teacher cannot encode grades until a (section, subject)
              load is added.
            </p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {loads.map((load) => (
                <li
                  key={`${load.sectionId}|${load.subjectId}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-brand-200 bg-brand-50/60 px-3 py-1.5 text-[13px] text-brand-900"
                >
                  <span>
                    <span className="font-medium">{sectionLabel(load.sectionId)}</span>
                    <span aria-hidden="true" className="mx-1.5 text-brand-400">
                      ·
                    </span>
                    <span>{subjectLabel(load.subjectId)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLoad(load.sectionId, load.subjectId)}
                    className="text-xs font-medium text-red-700 hover:text-red-800"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {accountOptions.length === 0 ? (
            <p className="mt-3 text-xs text-[#64748B]">
              No active Subject Teacher login account is available — create one on the Users page
              first, then link it here.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Government / personnel information */}
      <div className="border-t border-brand-200 pt-4">
        <h3 className="text-sm font-semibold text-brand-900">Government / Personnel Information</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="GSIS number" htmlFor="employee-gsis" error={err("gsisNumber")}>
            <Input id="employee-gsis" name="gsisNumber" defaultValue={val("gsisNumber", employee?.gsisNumber)} maxLength={40} />
          </Field>
          <Field label="PhilHealth number" htmlFor="employee-philhealth" error={err("philhealthNumber")}>
            <Input id="employee-philhealth" name="philhealthNumber" defaultValue={val("philhealthNumber", employee?.philhealthNumber)} maxLength={40} />
          </Field>
          <Field label="Pag-IBIG number" htmlFor="employee-pagibig" error={err("pagibigNumber")}>
            <Input id="employee-pagibig" name="pagibigNumber" defaultValue={val("pagibigNumber", employee?.pagibigNumber)} maxLength={40} />
          </Field>
          <Field label="TIN" htmlFor="employee-tin" error={err("tinNumber")}>
            <Input id="employee-tin" name="tinNumber" defaultValue={val("tinNumber", employee?.tinNumber)} maxLength={40} />
          </Field>
          <Field label="PRC license no." htmlFor="employee-prc" error={err("prcLicenseNumber")}>
            <Input id="employee-prc" name="prcLicenseNumber" defaultValue={val("prcLicenseNumber", employee?.prcLicenseNumber)} maxLength={40} />
          </Field>
          <Field label="Eligibility" htmlFor="employee-eligibility" error={err("eligibility")}>
            <Input id="employee-eligibility" name="eligibility" defaultValue={val("eligibility", employee?.eligibility)} maxLength={200} placeholder="Civil Service Professional…" />
          </Field>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create employee record" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
