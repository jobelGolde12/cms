import { redirect } from "next/navigation";
import Link from "next/link";
import { History } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listAuditLogs, auditLogCount } from "@/lib/queries";
import { hasPermission } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { RegistryPagination } from "@/components/registry/registry-ui";

const ALLOWED_PAGE_SIZES = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

export default async function ActivityLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "audit_logs.view")) redirect("/dashboard");

  const params = await searchParams;
  const rawPage = typeof params.page === "string" ? parseInt(params.page, 10) : NaN;
  const rawPageSize = typeof params.pageSize === "string" ? parseInt(params.pageSize, 10) : NaN;
  const page = Math.max(1, Number.isNaN(rawPage) ? 1 : rawPage);
  const pageSize = ALLOWED_PAGE_SIZES.includes(rawPageSize as (typeof ALLOWED_PAGE_SIZES)[number])
    ? rawPageSize
    : DEFAULT_PAGE_SIZE;

  const [rows, total] = await Promise.all([listAuditLogs(page, pageSize), auditLogCount()]);

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
          description={`${total.toLocaleString("en-PH")} audit entr${total === 1 ? "y" : "ies"} recorded.`}
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
          <tbody className="divide-y divide-[#DCE4F0]">
            {rows.length === 0 ? (
              <TableEmptyState
                colSpan={4}
                icon={<History className="h-10 w-10" />}
                title={page > 1 && total > 0 ? "No entries on this page" : "No audit entries"}
                description={
                  page > 1 && total > 0
                    ? "This page is beyond the recorded history. Return to an earlier page."
                    : "Actions performed in the system are recorded here automatically."
                }
              />
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-[#F4F7FC]">
                  <Td className="numeric text-xs text-[#263449]">{r.action}</Td>
                  <Td className="text-xs text-[#263449]">
                    {r.entityType}
                    {r.entityId ? <span className="text-[#64748B]"> · {r.entityId.slice(0, 8)}…</span> : null}
                  </Td>
                  <Td className="text-xs text-[#263449]">
                    {r.userFirst ? `${r.userFirst} ${r.userLast}` : "system"}
                  </Td>
                  <Td className="text-xs text-[#64748B]">{formatDateTime(r.createdAt)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
        {total > 0 ? (
          <RegistryPagination
            page={page}
            pageSize={pageSize}
            total={total}
            searchParams={{ ...params }}
            basePath="/activity-logs"
            itemLabel="entries"
          />
        ) : (
          <div className="border-t border-brand-100 px-4 py-3 text-xs text-[#64748B]">
            Recorded actions will appear here.{" "}
            <Link href="/dashboard" className="font-medium text-action-700 hover:text-action-800">
              Back to dashboard
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
