"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { create201Record, update201Record } from "@/actions/employees";
import { Modal } from "./modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  EMPLOYEE_201_CATEGORIES,
  EMPLOYEE_201_CATEGORY_LABELS,
} from "@/lib/constants";
import type { ActionState } from "@/actions/helpers";

type Editable201Record = {
  id: string;
  employeeId: string;
  category: string;
  title: string;
  description: string | null;
  recordDate: string;
  fileReference: string | null;
};

const initial: ActionState = { ok: false, error: "" };

export function Add201RecordModal({ employeeId }: { employeeId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await create201Record(prev, formData);
    if (result.ok) setOpen(false);
    return result;
  }, initial);
  const err = (key: string): string | undefined =>
    state.ok === false ? state.fieldErrors?.[key] : undefined;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add 201 Entry
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add 201 File Entry"
        description="Personnel documents are categorized and dated; entries are never deleted."
        wide
      >
        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="employeeId" value={employeeId} />
          {state.ok === false && state.error ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
              {state.error}
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="rec-category" required error={err("category")}>
              <Select id="rec-category" name="category" defaultValue="" required>
                <option value="" disabled>
                  Select…
                </option>
                {EMPLOYEE_201_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {EMPLOYEE_201_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Record date" htmlFor="rec-date" required error={err("recordDate")}>
              <Input id="rec-date" name="recordDate" type="date" required />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Title" htmlFor="rec-title" required error={err("title")}>
                <Input id="rec-title" name="title" required maxLength={200} placeholder="e.g. Special Order No. 123 — Adviser Assignment" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description" htmlFor="rec-description" error={err("description")}>
                <Textarea id="rec-description" name="description" maxLength={500} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Reference / document no." htmlFor="rec-reference" error={err("fileReference")} hint="Storage key or document code (uploads land in external storage).">
                <Input id="rec-reference" name="fileReference" maxLength={200} />
              </Field>
            </div>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save entry"}
          </Button>
        </form>
      </Modal>
    </>
  );
}

export function Edit201RecordModal({ record }: { record: Editable201Record }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await update201Record(prev, formData);
    if (result.ok) setOpen(false);
    return result;
  }, initial);
  const err = (key: string): string | undefined =>
    state.ok === false ? state.fieldErrors?.[key] : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${record.title}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-brand-600 transition-colors hover:bg-brand-100 hover:text-brand-900"
      >
        <Pencil aria-hidden="true" className="h-4 w-4" />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Edit 201 Entry — ${record.title}`}
        wide
      >
        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="recordId" value={record.id} />
          <input type="hidden" name="employeeId" value={record.employeeId} />
          {state.ok === false && state.error ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
              {state.error}
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="edit-rec-category" required error={err("category")}>
              <Select id="edit-rec-category" name="category" defaultValue={record.category} required>
                {EMPLOYEE_201_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {EMPLOYEE_201_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Record date" htmlFor="edit-rec-date" required error={err("recordDate")}>
              <Input id="edit-rec-date" name="recordDate" type="date" defaultValue={record.recordDate} required />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Title" htmlFor="edit-rec-title" required error={err("title")}>
                <Input id="edit-rec-title" name="title" defaultValue={record.title} required maxLength={200} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description" htmlFor="edit-rec-description" error={err("description")}>
                <Textarea id="edit-rec-description" name="description" defaultValue={record.description ?? ""} maxLength={500} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Reference / document no." htmlFor="edit-rec-reference" error={err("fileReference")}>
                <Input id="edit-rec-reference" name="fileReference" defaultValue={record.fileReference ?? ""} maxLength={200} />
              </Field>
            </div>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
