"use client";

import { useActionState } from "react";
import { createChild, updateChild } from "@/actions/children";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  ASSISTANCE_STATUSES,
  DISABILITY_TYPES,
  DISABILITY_TYPE_LABELS,
  ECCD_STATUSES,
  ECCD_STATUS_LABELS,
  EDUCATION_STATUSES,
  EDUCATION_STATUS_LABELS,
  SEXES,
} from "@/lib/constants";

type Barangay = { id: string; name: string };
type School = { id: string; name: string };

export type ChildFormDefaults = {
  id?: string;
  childCode?: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  suffix?: string | null;
  birthDate?: string;
  sex?: string;
  civilStatus?: string | null;
  birthPlace?: string | null;
  barangayId?: string;
  householdAddress?: string;
  sitio?: string | null;
  educationStatus?: string;
  schoolId?: string | null;
  gradeLevel?: string | null;
  schoolYear?: string | null;
  eccdStatus?: string;
  eccdProgramName?: string | null;
  eccdProvider?: string | null;
  hasDisability?: boolean;
  disabilityType?: string | null;
  disabilityDescription?: string | null;
  disabilitySupportNeeded?: string | null;
  assistanceStatus?: string | null;
};

const ASSISTANCE_LABELS: Record<string, string> = {
  none: "None",
  assessment: "For Assessment",
  support: "Receiving Support",
  referred: "Referred",
  ongoing: "Ongoing",
  completed: "Completed",
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

export function ChildForm({
  barangays,
  schools,
  defaults = {},
  mode,
}: {
  barangays: Barangay[];
  schools: School[];
  defaults?: ChildFormDefaults;
  mode: "create" | "edit";
}) {
  const action = mode === "create" ? createChild : updateChild;
  const initial: Awaited<ReturnType<typeof createChild>> = { ok: false, error: "" };
  const [state, formAction, pending] = useActionState(action, initial);

  const err = (key: string): string | undefined =>
    state.ok === false ? state.fieldErrors?.[key] : undefined;

  return (
    <form action={formAction} className="space-y-5">
      {mode === "edit" ? <input type="hidden" name="childId" value={defaults.id ?? ""} /> : null}

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
          <Field label="Civil status" htmlFor="civilStatus">
            <Input id="civilStatus" name="civilStatus" defaultValue={defaults.civilStatus ?? "single"} maxLength={20} />
          </Field>
          <Field label="Birth place" htmlFor="birthPlace">
            <Input id="birthPlace" name="birthPlace" defaultValue={defaults.birthPlace ?? ""} maxLength={200} />
          </Field>
        </div>
      </FormSection>

      {/* Address */}
      <FormSection title="Household Address">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Barangay" htmlFor="barangayId" required error={err("barangayId")}>
            <Select id="barangayId" name="barangayId" defaultValue={defaults.barangayId ?? ""} required>
              <option value="" disabled>Select barangay…</option>
              {barangays.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Sitio" htmlFor="sitio">
            <Input id="sitio" name="sitio" defaultValue={defaults.sitio ?? ""} maxLength={120} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Household address" htmlFor="householdAddress" required error={err("householdAddress")}>
              <Textarea id="householdAddress" name="householdAddress" defaultValue={defaults.householdAddress ?? ""} required maxLength={300} />
            </Field>
          </div>
        </div>
      </FormSection>

      {/* Education */}
      <FormSection title="Education">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Educational status" htmlFor="educationStatus" required error={err("educationStatus")}>
            <Select id="educationStatus" name="educationStatus" defaultValue={defaults.educationStatus ?? "not_yet_in_school"} required>
              {EDUCATION_STATUSES.map((s) => (
                <option key={s} value={s}>{EDUCATION_STATUS_LABELS[s]}</option>
              ))}
            </Select>
          </Field>
          <Field label="School" htmlFor="schoolId" hint="Leave empty for out-of-school children.">
            <Select id="schoolId" name="schoolId" defaultValue={defaults.schoolId ?? ""}>
              <option value="">No school</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Grade level" htmlFor="gradeLevel">
            <Input id="gradeLevel" name="gradeLevel" defaultValue={defaults.gradeLevel ?? ""} maxLength={30} placeholder="Kinder, Grade 3…" />
          </Field>
          <Field label="School year" htmlFor="schoolYear" error={err("schoolYear")}>
            <Input id="schoolYear" name="schoolYear" defaultValue={defaults.schoolYear ?? ""} maxLength={9} placeholder="2026-2027" />
          </Field>
        </div>
      </FormSection>

      {/* ECCD */}
      <FormSection title="ECCD">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="ECCD participation" htmlFor="eccdStatus" required error={err("eccdStatus")}>
            <Select id="eccdStatus" name="eccdStatus" defaultValue={defaults.eccdStatus ?? "unknown"} required>
              {ECCD_STATUSES.map((s) => (
                <option key={s} value={s}>{ECCD_STATUS_LABELS[s]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Program / center" htmlFor="eccdProgramName">
            <Input id="eccdProgramName" name="eccdProgramName" defaultValue={defaults.eccdProgramName ?? ""} maxLength={120} />
          </Field>
          <Field label="Provider" htmlFor="eccdProvider">
            <Input id="eccdProvider" name="eccdProvider" defaultValue={defaults.eccdProvider ?? ""} maxLength={120} />
          </Field>
          <Field label="Remarks" htmlFor="eccdRemarks">
            <Input id="eccdRemarks" name="eccdRemarks" maxLength={300} />
          </Field>
        </div>
      </FormSection>

      {/* Disability (sensitive) */}
      <FormSection
        title="Disability Information"
        hint="Handled as restricted data; only authorized users can view it."
      >
        <label className="flex items-center gap-2 text-sm text-brand-800">
          <input type="checkbox" name="hasDisability" defaultChecked={defaults.hasDisability ?? false} className="h-4 w-4 rounded border-brand-300" />
          Child has a recorded disability
        </label>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Disability type" htmlFor="disabilityType">
            <Select id="disabilityType" name="disabilityType" defaultValue={defaults.disabilityType ?? ""}>
              <option value="">Not specified</option>
              {DISABILITY_TYPES.map((t) => (
                <option key={t} value={t}>{DISABILITY_TYPE_LABELS[t]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Assistance status" htmlFor="assistanceStatus">
            <Select id="assistanceStatus" name="assistanceStatus" defaultValue={defaults.assistanceStatus ?? ""}>
              <option value="">Not specified</option>
              {ASSISTANCE_STATUSES.map((s) => (
                <option key={s} value={s}>{ASSISTANCE_LABELS[s] ?? s}</option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description" htmlFor="disabilityDescription">
              <Textarea id="disabilityDescription" name="disabilityDescription" defaultValue={defaults.disabilityDescription ?? ""} maxLength={300} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Support needed" htmlFor="disabilitySupportNeeded">
              <Textarea id="disabilitySupportNeeded" name="disabilitySupportNeeded" defaultValue={defaults.disabilitySupportNeeded ?? ""} maxLength={300} />
            </Field>
          </div>
        </div>
      </FormSection>

      {/* Submit */}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="intent" value="draft" variant="outline" size="md" disabled={pending}>
          {pending ? "Saving…" : "Save draft"}
        </Button>
        <Button type="submit" name="intent" value="submit" size="md" disabled={pending}>
          {pending ? "Submitting…" : mode === "create" ? "Save & submit for validation" : "Save & resubmit"}
        </Button>
      </div>
    </form>
  );
}
