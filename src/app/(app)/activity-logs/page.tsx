import { redirect } from "next/navigation";
import { History } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listAuditLogs } from "@/lib/queries";
import { hasPermission } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";

export default async function ActivityLogsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "audit_logs.view")) redirect("/dashboard");

  const rows = await listAuditLogs(100);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Audit Trail"
        title="Activity Logs"
        description="Append-only audit trail. Entries cannot be edited or deleted through the application."
      />

      <Card>
        <CardHeader
          title="Recent activity"
          description={`Latest ${rows.length} entr${rows.length === 1 ? "y" : "ies"}.`}
          icon={<History aria-hidden="true" className="h-4 w-4" />}
        />
        <TableWrap minWidth={720}>
          <thead>
            <tr>
              <Th>Action</Th>
              <Th>Entity</Th>
              <Th>User</Th>
              <Th>Time</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {rows.length === 0 ? (
              <TableEmptyState
                colSpan={4}
                icon={<History className="h-10 w-10" />}
                title="No audit entries"
                description="Actions performed in the system are recorded here automatically."
              />
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-brand-50/70">
                  <Td className="numeric text-xs text-brand-700">{r.action}</Td>
                  <Td className="text-xs text-brand-700">
                    {r.entityType}
                    {r.entityId ? <span className="text-brand-400"> · {r.entityId.slice(0, 8)}…</span> : null}
                  </Td>
                  <Td className="text-xs text-brand-600">
                    {r.userFirst ? `${r.userFirst} ${r.userLast}` : "system"}
                  </Td>
                  <Td className="text-xs text-brand-500">{formatDateTime(r.createdAt)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}
