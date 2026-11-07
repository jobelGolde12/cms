"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, UserX } from "lucide-react";
import { createUser, deactivateUser, updateUser } from "@/actions/users";
import type { ActionState } from "@/actions/helpers";
import { Modal } from "@/components/employees/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useFormResetGuard } from "@/components/ui/form-reset-guard";
import { ADDITIONAL_ROLE_OPTIONS } from "@/lib/constants";

export type RoleOption = { id: string; name: string; description?: string | null };

export type UserRowData = {
  id: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  phone: string | null;
  roleId: string;
  roleLabel: string;
  /** Additional teaching roles (Adviser / Subject Teacher) the account holds. */
  additionalRoleIds: string[];
  isActive: boolean;
};

/**
 * "New account" trigger + dialog. The account is created inactive-by-default
 * only if the administrator says so — the server action owns the role
 * escalation guard, the duplicate-email check and the password hashing.
 */
export function AddUserButton({ roleOptions }: { roleOptions: RoleOption[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus aria-hidden="true" className="h-4 w-4" />
        New Account
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New User Account"
        description="Personnel sign in with the e-mail and temporary password set here. Passwords are hashed server-side and never shown again."
      >
        <UserForm
          mode="create"
          roleOptions={roleOptions}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}

/** Edit trigger + dialog for a single account. */
export function UserEditButton({
  user,
  roleOptions,
}: {
  user: UserRowData;
  roleOptions: RoleOption[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${user.firstName} ${user.lastName}`}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#64748B] transition-colors hover:bg-brand-100 hover:text-brand-900"
      >
        <Pencil aria-hidden="true" className="h-4 w-4" />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Edit — ${user.firstName} ${user.lastName}`}
        description="Leave the password blank to keep the current one."
      >
        <UserForm
          key={user.id}
          mode="edit"
          user={user}
          roleOptions={roleOptions}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}

/**
 * Deactivate (never delete) an account. Historical records stay intact and
 * the account can be re-enabled later from the edit dialog.
 */
export function UserDisableButton({
  user,
  currentUserId,
}: {
  user: UserRowData;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const initial: ActionState = { ok: false, error: "" };
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await deactivateUser(prev, formData);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      }
      return result;
    },
    initial,
  );

  if (user.id === currentUserId) {
    return (
      <span className="text-[11px] text-[#64748B]" title="You cannot disable your own account">
        —
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!user.isActive}
        aria-label={`Disable ${user.firstName} ${user.lastName}`}
        title={user.isActive ? "Disable account" : "Account is already disabled"}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#64748B] transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <UserX aria-hidden="true" className="h-4 w-4" />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Disable ${user.firstName} ${user.lastName}?`}
        description="The account can no longer sign in. Every record the person created or signed stays in the audit trail and is never removed."
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="userId" value={user.id} />
          {state.ok === false && state.error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800"
            >
              {state.error}
            </div>
          ) : null}
          <p className="text-sm text-[#64748B]">
            {user.email} · {user.roleLabel}
          </p>
          <div className="flex gap-3">
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? "Disabling…" : "Disable account"}
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

/** Shared create/edit form. */
function UserForm({
  mode,
  user,
  roleOptions,
  onSuccess,
}: {
  mode: "create" | "edit";
  user?: UserRowData;
  roleOptions: RoleOption[];
  onSuccess: () => void;
}) {
  const action = mode === "create" ? createUser : updateUser;
  const initial: ActionState = { ok: false, error: "" };
  const { formRef, onReset } = useFormResetGuard();

  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) onSuccess();
      return result;
    },
    initial,
  );

  const err = (key: string): string | undefined =>
    state.ok === false ? state.fieldErrors?.[key] : undefined;

  return (
    <form ref={formRef} action={formAction} onReset={onReset} className="space-y-4" noValidate>
      {mode === "edit" ? <input type="hidden" name="userId" value={user?.id ?? ""} /> : null}

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="user-first-name" required error={err("firstName")}>
          <Input
            id="user-first-name"
            name="firstName"
            defaultValue={user?.firstName ?? ""}
            required
            maxLength={60}
            autoComplete="given-name"
          />
        </Field>
        <Field label="Middle name" htmlFor="user-middle-name" error={err("middleName")}>
          <Input
            id="user-middle-name"
            name="middleName"
            defaultValue={user?.middleName ?? ""}
            maxLength={60}
          />
        </Field>
        <Field label="Last name" htmlFor="user-last-name" required error={err("lastName")}>
          <Input
            id="user-last-name"
            name="lastName"
            defaultValue={user?.lastName ?? ""}
            required
            maxLength={60}
            autoComplete="family-name"
          />
        </Field>
        <Field
          label="E-mail"
          htmlFor="user-email"
          required
          error={err("email")}
          hint="The sign-in address. It must be unique in the system."
        >
          <Input
            id="user-email"
            name="email"
            type="email"
            defaultValue={user?.email ?? ""}
            required
            maxLength={120}
            autoComplete="off"
          />
        </Field>
        <Field
          label="Role"
          htmlFor="user-role"
          required
          error={err("roleId")}
          hint="The role decides what the account may see and change."
        >
          <Select id="user-role" name="roleId" defaultValue={user?.roleId ?? ""} required>
            <option value="" disabled>
              Select…
            </option>
            {roleOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset className="sm:col-span-2 rounded-md border border-brand-200 px-3 py-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
            Additional teaching roles
          </legend>
          <p className="mb-2 text-xs text-[#64748B]">
            One teacher may be both an Adviser and a Subject Teacher. The extra role is granted to
            this same account — never a second employee record — and the effective permissions are
            the union of both roles.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {ADDITIONAL_ROLE_OPTIONS.map((option) => (
              <label key={option.id} className="flex items-center gap-2 text-sm text-brand-800">
                <input
                  type="checkbox"
                  name="additionalRoleId"
                  value={option.id}
                  defaultChecked={user?.additionalRoleIds.includes(option.id) ?? false}
                  className="h-4 w-4 rounded border-brand-300 text-action-700 focus:ring-action-600"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Phone" htmlFor="user-phone" error={err("phone")} hint="Optional contact number.">
          <Input
            id="user-phone"
            name="phone"
            defaultValue={user?.phone ?? ""}
            maxLength={30}
            inputMode="tel"
          />
        </Field>
        <Field
          label={mode === "create" ? "Temporary password" : "New password"}
          htmlFor="user-password"
          required={mode === "create"}
          error={err("password")}
          hint={
            mode === "create"
              ? "At least 8 characters. Share it out of band; it is never displayed again."
              : "Leave blank to keep the current password."
          }
        >
          <Input
            id="user-password"
            name="password"
            type="password"
            defaultValue=""
            required={mode === "create"}
            minLength={mode === "create" ? 8 : undefined}
            maxLength={128}
            autoComplete="new-password"
          />
        </Field>
      </div>

      {/* Hidden field + checkbox: the checkbox alone disappears from FormData
          when unchecked, which would silently re-activate the account. */}
      <input type="hidden" name="isActive" value="false" />
      <label className="flex items-center gap-2 text-sm text-brand-800">
        <input
          type="checkbox"
          name="isActive"
          value="true"
          defaultChecked={user ? user.isActive : true}
          className="h-4 w-4 rounded border-brand-300 text-action-700 focus:ring-action-600"
        />
        Account is active and may sign in
      </label>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create account"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
