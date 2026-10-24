"use client";

import { useActionState, useState } from "react";
import { PencilLine } from "lucide-react";
import { updateServiceCreditTransaction } from "@/actions/employees";
import { Modal } from "./modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { ActionState } from "@/actions/helpers";

/**
 * Correct an existing service-credit transaction. Reuses the server-side
 * validation of `updateServiceCreditTransaction` (projected balance, audit
 * trail). The projected balance shown here is only a preview — the server
 * recomputes it from the ledger before writing anything.
 */
export type EditableTransaction = {
  id: string;
  type: string;
  credits: number;
  transactionDate: string;
  reason: string;
  referenceDocument: string | null;
  remarks: string | null;
};

export function ServiceCreditEditButton({
  transaction,
  employeeId,
  employeeName,
  balance,
}: {
  transaction: EditableTransaction;
  /** Passed through the form so the server can revalidate ownership. */
  employeeId: string;
  employeeName: string;
  /** Ledger-derived balance before this correction (server re-checks). */
  balance: number;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(transaction.type);
  const [credits, setCredits] = useState(String(transaction.credits));
  const [confirmChecked, setConfirmChecked] = useState(false);
  const initial: ActionState = { ok: false, error: "" };

  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await updateServiceCreditTransaction(prev, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    initial,
  );
  const err = (key: string): string | undefined =>
    state.ok === false ? state.fieldErrors?.[key] : undefined;

  /** Live projection: old entry's effect is replaced by the edited one. */
  const effect = (t: string, amount: number) => (t === "earned" ? +amount : -amount);
  const oldCredits = Number(String(transaction.credits)) || 0;
  const newCredits = Number(credits) || 0;
  const projected =
    Math.round(
      (balance - effect(transaction.type, oldCredits) + effect(type, newCredits)) * 100,
    ) / 100;
  const wouldGoNegative = projected < 0;

  return (
    <>
      <button
        type="button"
        aria-label={`Correct transaction of ${transaction.transactionDate}`}
        onClick={() => {
          setConfirmChecked(false);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#263449] hover:bg-brand-100 hover:text-[#14295F]"
      >
        <PencilLine aria-hidden="true" className="h-3 w-3" />
        Correct
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Correct Transaction — ${employeeName}`}
        description={`Editing the ${transaction.type === "earned" ? "earned" : "consumed"} entry of ${transaction.transactionDate} (${transaction.credits.toFixed(2)} credits). The previous values stay in the audit history.`}
      >
        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="employeeId" value={employeeId} />
          <input type="hidden" name="transactionId" value={transaction.id} />
          {state.ok === false && state.error ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
              {state.error}
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Transaction type" htmlFor="sc-edit-type" required error={err("type")}>
              <Select
                id="sc-edit-type"
                name="type"
                required
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="earned">Earned</option>
                <option value="consumed">Consumed</option>
              </Select>
            </Field>
            <Field
              label="Credits"
              htmlFor="sc-edit-credits"
              required
              error={err("credits")}
              hint="A correction may not exceed the available balance."
            >
              <Input
                id="sc-edit-credits"
                name="credits"
                type="number"
                step="0.01"
                min="0.01"
                max="365"
                required
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
              />
            </Field>
            <Field label="Transaction date" htmlFor="sc-edit-date" required error={err("transactionDate")}>
              <Input
                id="sc-edit-date"
                name="transactionDate"
                type="date"
                required
                defaultValue={transaction.transactionDate}
              />
            </Field>
            <Field
              label="Reference document"
              htmlFor="sc-edit-reference"
              error={err("referenceDocument")}
              hint="e.g. Office Order No. 2026-01"
            >
              <Input
                id="sc-edit-reference"
                name="referenceDocument"
                maxLength={100}
                defaultValue={transaction.referenceDocument ?? ""}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Reason" htmlFor="sc-edit-reason" required error={err("reason")}>
                <Input
                  id="sc-edit-reason"
                  name="reason"
                  required
                  maxLength={300}
                  defaultValue={transaction.reason}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Remarks" htmlFor="sc-edit-remarks" error={err("remarks")}>
                <Textarea id="sc-edit-remarks" name="remarks" maxLength={300} defaultValue={transaction.remarks ?? ""} />
              </Field>
            </div>
          </div>

          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              wouldGoNegative
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-brand-200 bg-[#f8fafc] text-brand-800"
            }`}
          >
            <p className="font-semibold numeric">
              Projected balance after this correction: {projected.toFixed(2)}
            </p>
            <p className="mt-0.5 text-xs">
              Current balance {balance.toFixed(2)} — the server recalculates this from the ledger
              before saving.
            </p>
          </div>

          <label className="flex items-start gap-2 text-xs text-[#64748B]">
            <input
              type="checkbox"
              required
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 rounded border-brand-300 text-action-600 focus:ring-action-500"
            />
            I understand this corrects an existing ledger entry; the previous values are kept in the
            audit trail.
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !confirmChecked}>
              {pending ? "Saving…" : "Apply correction"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
