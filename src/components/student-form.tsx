"use client";

import { useActionState } from "react";
import { createStudent, updateStudent } from "@/actions/students";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SEXES } from "@/lib/constants";

export type StudentFormDefaults = {
  id?: string;
  studentNumber?: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  suffix?: string | null;
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

/** Shared section shell so every form group looks identical. */
function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-brand-200 bg-white p-5 shadow-xs sm:p-6">
      <h2 className="text-sm font-semibold text-brand-900">{title}</h2>
      {hint ? <p className="mt-1 text-xs text-brand-500">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  mother: "Mother",
  father: "Father",
  guardian: "Guardian",
};

export function StudentForm({
  defaults = {},
  mode,
}: {
  defaults?: StudentFormDefaults;
  mode: "create" | "edit";
}) {
  const action = mode === "create" ? createStudent : updateStudent;
  const initial: Awaited<ReturnType<typeof createStudent>> = { ok: false, error: "" };
  const [state, formAction, pending] = useActionState(action, initial);

  const err = (key: string): string | undefined =>
    state.ok === false ? state.fieldErrors?.[key] : undefined;

  return (
    <form action={formAction} className="space-y-5">
      {mode === "edit" ? <input type="hidden" name="studentId" value={defaults.id ?? ""} /> : null}

      {state.ok === false && state.error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-status-error-bg px-3 py-2 text-sm font-medium text-red-800">
          {state.error}
        </div>
      ) : null}

      {state.ok === true && state.message ? (
        <div role="status" className="rounded-lg border border-emerald-200 bg-status-verified-bg px-3 py-2.5 text-sm font-medium text-status-verified transition-opacity duration-300 animate-[fadeIn_300ms_ease-in]">
          {state.message}
        </div>
      ) : null}

      {/* Basic information */}
      <FormSection title="Basic Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="firstName" required error={err("firstName")}>
            <Input id="firstName" name="firstName" defaultValue={defaults.firstName ?? ""} required maxLength={60} />
          </Field>
          <Field label="Middle name" htmlFor="middleName" error={err("middleName")}>
            <Input id="middleName" name="middleName" defaultValue={defaults.middleName ?? ""} maxLength={60} />
          </Field>
          <Field label="Last name" htmlFor="lastName" required error={err("lastName")}>
            <Input id="lastName" name="lastName" defaultValue={defaults.lastName ?? ""} required maxLength={60} />
          </Field>
          <Field label="Suffix" htmlFor="suffix" error={err("suffix")}>
            <Input id="suffix" name="suffix" defaultValue={defaults.suffix ?? ""} maxLength={10} placeholder="Jr., III…" />
          </Field>
          <Field label="Birth date" htmlFor="birthDate" required error={err("birthDate")}>
            <Input id="birthDate" name="birthDate" type="date" defaultValue={defaults.birthDate ?? ""} required />
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
      </FormSection>

      {/* Contact */}
      <FormSection title="Contact & Address">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Contact number" htmlFor="contactNumber" error={err("contactNumber")}>
            <Input
              id="contactNumber"
              name="contactNumber"
              defaultValue={defaults.contactNumber ?? ""}
              maxLength={30}
              placeholder="0917 000 0000"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address" htmlFor="address" error={err("address")}>
              <Textarea id="address" name="address" defaultValue={defaults.address ?? ""} maxLength={300} />
            </Field>
          </div>
        </div>
      </FormSection>

      {/* Primary guardian */}
      <FormSection
        title="Primary Guardian"
        hint="Optional when creating the record; a guardian can be added later."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="guardianFirstName" error={err("guardianFirstName")}>
            <Input id="guardianFirstName" name="guardianFirstName" defaultValue={defaults.guardianFirstName ?? ""} maxLength={60} />
          </Field>
          <Field label="Middle name" htmlFor="guardianMiddleName">
            <Input id="guardianMiddleName" name="guardianMiddleName" defaultValue={defaults.guardianMiddleName ?? ""} maxLength={60} />
          </Field>
          <Field label="Last name" htmlFor="guardianLastName" error={err("guardianLastName")}>
            <Input id="guardianLastName" name="guardianLastName" defaultValue={defaults.guardianLastName ?? ""} maxLength={60} />
          </Field>
          <Field label="Relationship" htmlFor="guardianRelationship" error={err("guardianRelationship")}>
            <Select id="guardianRelationship" name="guardianRelationship" defaultValue={defaults.guardianRelationship ?? ""}>
              <option value="">Select…</option>
              {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Contact number" htmlFor="guardianContactNumber" error={err("guardianContactNumber")}>
            <Input id="guardianContactNumber" name="guardianContactNumber" defaultValue={defaults.guardianContactNumber ?? ""} maxLength={30} />
          </Field>
          <Field label="Email" htmlFor="guardianEmail" error={err("guardianEmail")}>
            <Input id="guardianEmail" name="guardianEmail" type="email" defaultValue={defaults.guardianEmail ?? ""} maxLength={120} />
          </Field>
        </div>
      </FormSection>

      {/* Submit */}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="intent" value="draft" variant="outline" size="md" disabled={pending}>
          {pending ? "Saving…" : "Save draft"}
        </Button>
        <Button type="submit" name="intent" value="submit" size="md" disabled={pending}>
          {pending ? "Submitting…" : mode === "create" ? "Save & submit for verification" : "Save & resubmit"}
        </Button>
      </div>
    </form>
  );
}
