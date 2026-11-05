"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { removeGuidanceIncident } from "@/actions/guidance";
import type { ActionState } from "@/actions/helpers";
import { Modal } from "@/components/employees/modal";
import { Button } from "@/components/ui/button";

/**
 * Remove an incident record from the Guidance Office roster.
 *
 * The server action re-checks the role chain (behavior.write + guidance /
 * admin / school_admin) and writes an audit entry, so the button is only a
 * convenience — the permission is never trusted from the client.
 */
export function IncidentDeleteButton({
  incidentId,
  studentLabel,
}: {
  incidentId: string;
  studentLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const initial: ActionState = { ok: false, error: "" };

  const [state, action, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await removeGuidanceIncident(formData);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      }
      return result;
    },
    initial,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Remove incident for ${studentLabel}`}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#64748B] transition-colors hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Remove this incident?"
        description="The incident is deleted from the Guidance Office roster. The removal itself is recorded in the audit log."
      >
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={incidentId} />
          {state.ok === false && state.error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800"
            >
              {state.error}
            </div>
          ) : null}
          <p className="text-sm text-[#64748B]">
            Incident record for <strong className="text-brand-800">{studentLabel}</strong>.
          </p>
          <div className="flex gap-3">
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? "Removing…" : "Remove incident"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
