"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { createSection, updateSection } from "@/actions/sections";
import { Modal } from "@/components/employees/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import type { ActionState } from "@/actions/helpers";
import { useFormResetGuard } from "@/components/ui/form-reset-guard";

export type SectionOption = { id: string; label: string };

export type SectionRowData = {
  id: string;
  name: string;
  schoolYearId: string;
  gradeLevelId: string;
  adviserId: string | null;
};

/**
 * Create/edit dialog for the admin Section Management module. Every
 * relationship field (school year, grade level, adviser) is a Select fed
 * from existing database entities — never free text — and is re-validated
 * server-side in the section actions.
 */
export function AddSectionButton({
  schoolYearOptions,
  gradeLevelOptions,
  adviserOptions,
}: {
  schoolYearOptions: SectionOption[];
  gradeLevelOptions: SectionOption[];
  adviserOptions: SectionOption[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add Section
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Section"
        description="Grade level and school year come from the academic structure — select, don't type."
      >
        <SectionForm
          mode="create"
          schoolYearOptions={schoolYearOptions}
          gradeLevelOptions={gradeLevelOptions}
          adviserOptions={adviserOptions}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}

export function SectionEditButton({
  section,
  schoolYearOptions,
  gradeLevelOptions,
  adviserOptions,
}: {
  section: SectionRowData;
  schoolYearOptions: SectionOption[];
  gradeLevelOptions: SectionOption[];
  adviserOptions: SectionOption[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-action-700 hover:text-action-800"
      >
        Edit
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Edit — ${section.name}`}
        wide
      >
        <SectionForm
          key={section.id}
          mode="edit"
          section={section}
          schoolYearOptions={schoolYearOptions}
          gradeLevelOptions={gradeLevelOptions}
          adviserOptions={adviserOptions}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}

function SectionForm({
  mode,
  section,
  schoolYearOptions,
  gradeLevelOptions,
  adviserOptions,
  onSuccess,
}: {
  mode: "create" | "edit";
  section?: SectionRowData;
  schoolYearOptions: SectionOption[];
  gradeLevelOptions: SectionOption[];
  adviserOptions: SectionOption[];
  onSuccess?: () => void;
}) {
  const action = mode === "create" ? createSection : updateSection;
  const initial: ActionState = { ok: false, error: "" };
  const { formRef, onReset } = useFormResetGuard();
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok && onSuccess) onSuccess();
      return result;
    },
    initial,
  );

  const err = (key: string): string | undefined =>
    state.ok === false ? state.fieldErrors?.[key] : undefined;

  return (
    <form ref={formRef} action={formAction} onReset={onReset} className="space-y-4" noValidate>
      {mode === "edit" ? <input type="hidden" name="id" value={section?.id ?? ""} /> : null}

      {state.ok === false && state.error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {state.error}
        </div>
      ) : null}
      {state.ok === true && state.message ? (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800">
          {state.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Section name" htmlFor="section-name" required error={err("name")}>
          <Input
            id="section-name"
            name="name"
            defaultValue={section?.name ?? ""}
            required
            maxLength={60}
            placeholder="Sampaguita"
          />
        </Field>
        <Field label="School year" htmlFor="section-sy" required error={err("schoolYearId")}>
          <Select id="section-sy" name="schoolYearId" defaultValue={section?.schoolYearId ?? ""} required>
            <option value="" disabled>
              Select…
            </option>
            {schoolYearOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Grade level" htmlFor="section-grade" required error={err("gradeLevelId")}>
          <Select id="section-grade" name="gradeLevelId" defaultValue={section?.gradeLevelId ?? ""} required>
            <option value="" disabled>
              Select…
            </option>
            {gradeLevelOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Adviser"
          htmlFor="section-adviser"
          error={err("adviserId")}
          hint="Optional — pick from active personnel accounts."
        >
          <Select id="section-adviser" name="adviserId" defaultValue={section?.adviserId ?? ""}>
            <option value="">No adviser assigned</option>
            {adviserOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create section" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

/** Owners-strip shown under section rows (non-interactive, drift-proof). */
export function SectionAdviserChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-brand-700">
      <Users aria-hidden="true" className="h-3 w-3" />
      {label}
    </span>
  );
}
