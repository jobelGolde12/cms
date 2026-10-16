"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { addServiceCreditTransaction } from "@/actions/employees";
import { Modal } from "./modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { ActionState } from "@/actions/helpers";

/**
 * Record a service-credit transaction (earned or consumed). Consumed amounts
 * are validated server-side against the ledger-derived balance; the current
 * balance is shown so the officer can see what is available.
 */
export function AddServiceCreditModal({
  employeeId,
  employeeName,
  balance,
}: {
  employeeId: string;
  employeeName: string;
  balance: number;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("");
  const initial: ActionState = { ok: false, error: "" };
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await addServiceCreditTransaction(prev, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    initial,
  );
  const err = (key: string): string | undefined =>
    state.ok === false ? state.fieldErrors?.[key] : undefined;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" className="h-4 w-4" />
        Record Transaction
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Service Credit — ${employeeName}`}
        description={`Available balance: ${balance.toFixed(2)}. Consumed amounts cannot exceed the balance.`}
      >
        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="employeeId" value={employeeId} />
          {state.ok === false && state.error ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
              {state.error}
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Transaction type" htmlFor="sc-type" required error={err("type")}>
              <Select
                id="sc-type"
                name="type"
                required
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="" disabled>
                  Select…
                </option>
                <option value="earned">Earned</option>
                <option value="consumed">Consumed</option>
              </Select>
            </Field>
            <Field
              label="Credits"
              htmlFor="sc-credits"
              required
              error={err("credits")}
              hint={type === "consumed" ? "Must not exceed the available balance." : undefined}
            >
              <Input
                id="sc-credits"
                name="credits"
                type="number"
                step="0.01"
                min="0.01"
                max="365"
                required
              />
            </Field>
            <Field label="Date" htmlFor="sc-date" required error={err("transactionDate")}>
              <Input id="sc-date" name="transactionDate" type="date" required />
            </Field>
            <Field label="Reference document" htmlFor="sc-reference" error={err("referenceDocument")} hint="e.g. Office Order No. 2026-01">
              <Input id="sc-reference" name="referenceDocument" maxLength={100} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Reason" htmlFor="sc-reason" required error={err("reason")}>
                <Input id="sc-reason" name="reason" required maxLength={300} placeholder="Reason for earning or consuming credits" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Remarks" htmlFor="sc-remarks" error={err("remarks")}>
                <Textarea id="sc-remarks" name="remarks" maxLength={300} />
              </Field>
            </div>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Record transaction"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
