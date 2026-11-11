"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { approveRegistration, rejectRegistration } from "@/actions/registration";
import type { ActionState } from "@/actions/helpers";
import { Modal } from "@/components/employees/modal";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import type { RoleOption } from "./user-management";

export type PendingRegistration = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  phone: string | null;
  requestedPosition: string | null;
  registrationNote: string | null;
  createdAt: Date;
};

const INITIAL: ActionState = { ok: false, error: "" };

/**
 * Approve a pending registration. The role dropdown is the ONLY way to grant
 * access; the server action re-validates the role against the canonical role
 * ids and refuses anything else. UI visibility is not the security boundary.
 */
export function ApproveRegistrationButton({
  registration,
  roleOptions,
}: {
  registration: PendingRegistration;
  roleOptions: RoleOption[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await approveRegistration(prev, formData);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      }
      return result;
    },
    INITIAL,
  );

  return (
    <>
      <Button size="sm" variant="primary" onClick={() => setOpen(true)}>
        <Check aria-hidden="true" className="h-3.5 w-3.5" />
        Review
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Approve ${registration.firstName} ${registration.lastName}`}
        description="Approving grants sign-in access. Assign the role that matches this person's actual duties — applicants cannot choose their own role."
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="userId" value={registration.id} />

          {state.ok === false && state.error ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
              {state.error}
            </div>
          ) : null}

          <dl className="grid gap-2 rounded-md border border-brand-200 bg-brand-50/50 px-3 py-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#64748B]">Email</dt>
              <dd className="break-all font-medium text-brand-900">{registration.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#64748B]">Requested position</dt>
              <dd className="font-medium text-brand-900">{registration.requestedPosition ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#64748B]">Phone</dt>
              <dd className="font-medium text-brand-900">{registration.phone ?? "—"}</dd>
            </div>
            {registration.registrationNote ? (
              <div>
                <dt className="text-[#64748B]">Applicant note</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-brand-800">{registration.registrationNote}</dd>
              </div>
            ) : null}
          </dl>

          <Field
            label="Assign role"
            htmlFor={`approve-role-${registration.id}`}
            required
            hint="The requested position is informational only — this selection decides access."
          >
            <Select id={`approve-role-${registration.id}`} name="roleId" defaultValue="" required>
              <option value="" disabled>
                Select a role
              </option>
              {roleOptions.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Approving…" : "Approve and assign role"}
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

/** Reject a pending registration with an optional internal reason. */
export function RejectRegistrationButton({ registration }: { registration: PendingRegistration }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await rejectRegistration(prev, formData);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      }
      return result;
    },
    INITIAL,
  );

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <X aria-hidden="true" className="h-3.5 w-3.5" />
        Reject
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Reject ${registration.firstName} ${registration.lastName}?`}
        description="The account cannot sign in. The registration is retained for the audit trail and can be reviewed again by an administrator."
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="userId" value={registration.id} />
          {state.ok === false && state.error ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
              {state.error}
            </div>
          ) : null}
          <Field
            label="Reason (internal)"
            htmlFor={`reject-reason-${registration.id}`}
            hint="Optional. Stored with the registration for audit purposes."
          >
            <Textarea id={`reject-reason-${registration.id}`} name="reason" maxLength={300} rows={3} />
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? "Rejecting…" : "Reject registration"}
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
