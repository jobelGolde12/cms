import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listUsersWithRoles } from "@/lib/queries";
import { hasPermission } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "users.view")) redirect("/dashboard");

  const rows = await listUsersWithRoles();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Access Control"
        title="User Management"
        description="School personnel accounts — System Administrator, School Administrator, Teacher/Adviser, Records and Guidance personnel. New accounts are provisioned by a System Administrator."
      />

      <Card>
        <CardHeader
          title="All accounts"
          description={`${rows.length} account${rows.length === 1 ? "" : "s"} in the system.`}
          icon={<Users aria-hidden="true" className="h-4 w-4" />}
        />
        <TableWrap minWidth={760}>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Last login</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {rows.length === 0 ? (
              <TableEmptyState
                colSpan={5}
                icon={<Users className="h-10 w-10" />}
                title="No user accounts"
                description="User accounts will appear here once created."
              />
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-brand-50/70">
                  <Td className="font-medium text-brand-900">
                    {r.firstName} {r.lastName}
                  </Td>
                  <Td className="text-brand-600">{r.email}</Td>
                  <Td className="text-xs text-brand-700">{r.roleLabel}</Td>
                  <Td>
                    <Badge tone={r.isActive ? "verified" : "error"}>
                      {r.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </Td>
                  <Td className="text-xs text-brand-500">
                    {r.lastLoginAt ? formatDateTime(r.lastLoginAt) : "—"}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}
