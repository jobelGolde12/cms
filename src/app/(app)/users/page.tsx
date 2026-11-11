import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  listAssignableRoles,
  listPendingRegistrations,
  listUsersWithRoles,
} from "@/lib/queries";
import { hasUserPermission } from "@/lib/permissions";
import { ACCOUNT_STATUS_LABELS, type AccountStatus } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import {
  AddUserButton,
  UserDisableButton,
  UserEditButton,
  type UserRowData,
} from "@/components/users/user-management";
import {
  ApproveRegistrationButton,
  RejectRegistrationButton,
  type PendingRegistration,
} from "@/components/users/registration-review";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasUserPermission(user.roles, "users.view")) redirect("/dashboard");

  const rows = await listUsersWithRoles();
  const roleOptions = await listAssignableRoles();
  const canManage = hasUserPermission(user.roles, "users.manage");
  const pending = canManage ? await listPendingRegistrations() : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Access Control"
        title="User Management"
        description="School personnel accounts — System Administrator, School Administrator, Adviser, Subject Teacher, Records, Guidance Counselor, Nurse, Registrar, Language & Literacy Coordinator and Admin Officer. Accounts are either provisioned by a System Administrator or requested through self-registration and approved here."
      />

      {canManage ? (
        <Card>
          <CardHeader
            title="Pending registrations"
            description={
              pending.length === 0
                ? "No registration is awaiting review."
                : `${pending.length} registration${pending.length === 1 ? "" : "s"} awaiting review. Approve and assign the role that matches the person's duties.`
            }
            icon={<Users aria-hidden="true" className="h-4 w-4" />}
          />
          {pending.length === 0 ? (
            <p className="px-6 py-6 text-sm text-[#64748B]">
              Self-registered accounts appear here. They cannot sign in until approved.
            </p>
          ) : (
            <TableWrap minWidth={760}>
              <thead>
                <tr>
                  <Th>Applicant</Th>
                  <Th>Email</Th>
                  <Th>Requested position</Th>
                  <Th>Submitted</Th>
                  <Th align="right">Review</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {pending.map((p) => {
                  const registration: PendingRegistration = {
                    id: p.id,
                    firstName: p.firstName,
                    middleName: p.middleName,
                    lastName: p.lastName,
                    email: p.email,
                    phone: p.phone,
                    requestedPosition: p.requestedPosition,
                    registrationNote: p.registrationNote,
                    createdAt: p.createdAt,
                  };
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-brand-50/70">
                      <Td className="font-medium text-brand-900">
                        {p.firstName} {p.lastName}
                      </Td>
                      <Td className="text-brand-600">{p.email}</Td>
                      <Td className="text-xs text-brand-700">{p.requestedPosition ?? "—"}</Td>
                      <Td className="text-xs text-[#64748B]">{formatDateTime(p.createdAt)}</Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-2">
                          <ApproveRegistrationButton registration={registration} roleOptions={roleOptions} />
                          <RejectRegistrationButton registration={registration} />
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="All accounts"
          description={`${rows.length} account${rows.length === 1 ? "" : "s"} in the system.`}
          icon={<Users aria-hidden="true" className="h-4 w-4" />}
          actions={canManage ? <AddUserButton roleOptions={roleOptions} /> : null}
        />
        <TableWrap minWidth={860}>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Last login</Th>
              {canManage ? <Th align="right">Actions</Th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {rows.length === 0 ? (
              <TableEmptyState
                colSpan={canManage ? 6 : 5}
                icon={<Users className="h-10 w-10" />}
                title="No user accounts"
                description="User accounts will appear here once created."
              />
            ) : (
              rows.map((r) => {
                const row: UserRowData = {
                  id: r.id,
                  email: r.email,
                  firstName: r.firstName,
                  middleName: r.middleName,
                  lastName: r.lastName,
                  phone: r.phone,
                  roleId: r.roleId,
                  roleLabel: r.roleLabel,
                  additionalRoleIds: r.additionalRoleIds,
                  isActive: r.isActive,
                  status: r.status,
                  mfaEnabled: r.mfaEnabled,
                };
                return (
                  <tr key={r.id} className="transition-colors hover:bg-brand-50/70">
                    <Td className="font-medium text-brand-900">
                      {r.firstName} {r.lastName}
                    </Td>
                    <Td className="text-brand-600">{r.email}</Td>
                    <Td className="text-xs text-brand-700">{r.roleLabel}</Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          tone={
                            !r.isActive || r.status === "disabled" || r.status === "suspended"
                              ? "error"
                              : r.status === "pending"
                                ? "pending"
                                : "verified"
                          }
                        >
                          {ACCOUNT_STATUS_LABELS[r.status as AccountStatus] ?? (r.isActive ? "Active" : "Disabled")}
                        </Badge>
                        {r.mfaEnabled ? <Badge tone="info">MFA</Badge> : null}
                      </div>
                    </Td>
                    <Td className="text-xs text-[#64748B]">
                      {r.lastLoginAt ? formatDateTime(r.lastLoginAt) : "—"}
                    </Td>
                    {canManage ? (
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1">
                          <UserEditButton user={row} roleOptions={roleOptions} />
                          <UserDisableButton user={row} currentUserId={user.id} />
                        </div>
                      </Td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}
