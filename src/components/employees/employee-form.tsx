"use client";

import { useActionState } from "react";
import { createEmployee, updateEmployee } from "@/actions/employees";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  CIVIL_STATUSES,
  CIVIL_STATUS_LABELS,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  SEXES,
} from "@/lib/constants";
import type { Employee } from "@/db/schema";
import type { ActionState } from "@/actions/helpers";

/**
 * Create/edit form for employee records. The employee number is generated
 * server-side when left blank, so the field is optional and clearly hinted.
 */
export function EmployeeForm({
  employee,
  mode,
  onSuccess,
}: {
  employee?: Employee;
  mode: "create" | "edit";
  onSuccess?: () => void;
}) {
  const action = mode === "create" ? createEmployee : updateEmployee;
  const initial: ActionState = { ok: false, error: "" };
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.ok && onSuccess) onSuccess();
    return result;
  }, initial);

  const err = (key: string): string | undefined =>
    state.ok === false ? state.fieldErrors?.[key] : undefined;

  return (
    <form action={formAction} className="space-y-5" noValidate>
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
              defaultValue={employee?.employeeNumber ?? ""}
              maxLength={30}
              placeholder="Auto"
            />
          </Field>
          <Field label="Sex" htmlFor="employee-sex" required error={err("sex")}>
            <Select id="employee-sex" name="sex" defaultValue={employee?.sex ?? ""} required>
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
            <Input id="employee-firstName" name="firstName" defaultValue={employee?.firstName ?? ""} required maxLength={60} autoComplete="given-name" />
          </Field>
          <Field label="Middle name" htmlFor="employee-middleName" error={err("middleName")}>
            <Input id="employee-middleName" name="middleName" defaultValue={employee?.middleName ?? ""} maxLength={60} />
          </Field>
          <Field label="Last name" htmlFor="employee-lastName" required error={err("lastName")}>
            <Input id="employee-lastName" name="lastName" defaultValue={employee?.lastName ?? ""} required maxLength={60} autoComplete="family-name" />
          </Field>
          <Field label="Suffix" htmlFor="employee-suffix" error={err("suffix")}>
            <Input id="employee-suffix" name="suffix" defaultValue={employee?.suffix ?? ""} maxLength={10} placeholder="Jr., III…" />
          </Field>
          <Field label="Birth date" htmlFor="employee-birthDate" error={err("birthDate")}>
            <Input id="employee-birthDate" name="birthDate" type="date" defaultValue={employee?.birthDate ?? ""} />
          </Field>
          <Field label="Civil status" htmlFor="employee-civilStatus" error={err("civilStatus")}>
            <Select id="employee-civilStatus" name="civilStatus" defaultValue={employee?.civilStatus ?? ""}>
              <option value="">Select…</option>
              {CIVIL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CIVIL_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Contact number" htmlFor="employee-contactNumber" error={err("contactNumber")} hint="PH format — 0917 123 4567.">
            <Input id="employee-contactNumber" name="contactNumber" defaultValue={employee?.contactNumber ?? ""} inputMode="tel" maxLength={20} />
          </Field>
          <Field label="Email" htmlFor="employee-email" error={err("email")}>
            <Input id="employee-email" name="email" type="email" defaultValue={employee?.email ?? ""} maxLength={120} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address" htmlFor="employee-address" error={err("address")}>
              <Textarea id="employee-address" name="address" defaultValue={employee?.address ?? ""} maxLength={300} />
            </Field>
          </div>
          <Field label="Emergency contact name" htmlFor="employee-ecName" error={err("emergencyContactName")}>
            <Input id="employee-ecName" name="emergencyContactName" defaultValue={employee?.emergencyContactName ?? ""} maxLength={120} />
          </Field>
          <Field label="Emergency contact relation" htmlFor="employee-ecRelation" error={err("emergencyContactRelation")}>
            <Input id="employee-ecRelation" name="emergencyContactRelation" defaultValue={employee?.emergencyContactRelation ?? ""} maxLength={40} placeholder="Spouse, parent…" />
          </Field>
          <Field label="Emergency contact number" htmlFor="employee-ecNumber" error={err("emergencyContactNumber")}>
            <Input id="employee-ecNumber" name="emergencyContactNumber" defaultValue={employee?.emergencyContactNumber ?? ""} inputMode="tel" maxLength={20} />
          </Field>
        </div>
      </div>

      {/* Employment information */}
      <div className="border-t border-brand-200 pt-4">
        <h3 className="text-sm font-semibold text-brand-900">Employment Information</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Position" htmlFor="employee-position" error={err("position")}>
            <Input id="employee-position" name="position" defaultValue={employee?.position ?? ""} maxLength={120} placeholder="Teacher I, School Nurse…" />
          </Field>
          <Field label="Designation" htmlFor="employee-designation" error={err("designation")}>
            <Input id="employee-designation" name="designation" defaultValue={employee?.designation ?? ""} maxLength={120} />
          </Field>
          <Field label="Appointment status" htmlFor="employee-appointmentStatus" error={err("appointmentStatus")}>
            <Select id="employee-appointmentStatus" name="appointmentStatus" defaultValue={employee?.appointmentStatus ?? ""}>
              <option value="">Select…</option>
              {APPOINTMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {APPOINTMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Employment type" htmlFor="employee-employmentType" error={err("employmentType")}>
            <Select id="employee-employmentType" name="employmentType" defaultValue={employee?.employmentType ?? ""}>
              <option value="">Select…</option>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EMPLOYMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Department / office" htmlFor="employee-department" error={err("department")}>
            <Input id="employee-department" name="department" defaultValue={employee?.department ?? ""} maxLength={120} />
          </Field>
          <Field label="Date hired" htmlFor="employee-dateHired" error={err("dateHired")}>
            <Input id="employee-dateHired" name="dateHired" type="date" defaultValue={employee?.dateHired ?? ""} />
          </Field>
          <Field label="Date of appointment" htmlFor="employee-dateAppointment" error={err("dateOfAppointment")}>
            <Input id="employee-dateAppointment" name="dateOfAppointment" type="date" defaultValue={employee?.dateOfAppointment ?? ""} />
          </Field>
          <Field label="Salary grade" htmlFor="employee-salaryGrade" error={err("salaryGrade")}>
            <Input id="employee-salaryGrade" name="salaryGrade" defaultValue={employee?.salaryGrade ?? ""} maxLength={20} placeholder="SG-11" />
          </Field>
          <Field label="Step" htmlFor="employee-step" error={err("step")}>
            <Input id="employee-step" name="step" defaultValue={employee?.step ?? ""} maxLength={20} placeholder="Step 1" />
          </Field>
        </div>
      </div>

      {/* Government / personnel information */}
      <div className="border-t border-brand-200 pt-4">
        <h3 className="text-sm font-semibold text-brand-900">Government / Personnel Information</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="GSIS number" htmlFor="employee-gsis" error={err("gsisNumber")}>
            <Input id="employee-gsis" name="gsisNumber" defaultValue={employee?.gsisNumber ?? ""} maxLength={40} />
          </Field>
          <Field label="PhilHealth number" htmlFor="employee-philhealth" error={err("philhealthNumber")}>
            <Input id="employee-philhealth" name="philhealthNumber" defaultValue={employee?.philhealthNumber ?? ""} maxLength={40} />
          </Field>
          <Field label="Pag-IBIG number" htmlFor="employee-pagibig" error={err("pagibigNumber")}>
            <Input id="employee-pagibig" name="pagibigNumber" defaultValue={employee?.pagibigNumber ?? ""} maxLength={40} />
          </Field>
          <Field label="TIN" htmlFor="employee-tin" error={err("tinNumber")}>
            <Input id="employee-tin" name="tinNumber" defaultValue={employee?.tinNumber ?? ""} maxLength={40} />
          </Field>
          <Field label="PRC license no." htmlFor="employee-prc" error={err("prcLicenseNumber")}>
            <Input id="employee-prc" name="prcLicenseNumber" defaultValue={employee?.prcLicenseNumber ?? ""} maxLength={40} />
          </Field>
          <Field label="Eligibility" htmlFor="employee-eligibility" error={err("eligibility")}>
            <Input id="employee-eligibility" name="eligibility" defaultValue={employee?.eligibility ?? ""} maxLength={200} placeholder="Civil Service Professional…" />
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
