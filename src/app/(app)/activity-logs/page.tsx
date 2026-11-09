import { redirect } from "next/navigation";
import Link from "next/link";
import { History } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listAuditLogs, auditLogCount } from "@/lib/queries";
import { hasUserPermission } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { ClientNavForm } from "@/components/ui/client-nav-form";
import { buttonStyles } from "@/components/ui/button";
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
  if (!hasUserPermission(user.roles, "audit_logs.view")) redirect("/dashboard");

  const params = await searchParams;
  const rawPage = typeof params.page === "string" ? parseInt(params.page, 10) : NaN;
  const rawPageSize = typeof params.pageSize === "string" ? parseInt(params.pageSize, 10) : NaN;
  const page = Math.max(1, Number.isNaN(rawPage) ? 1 : rawPage);
  const pageSize = ALLOWED_PAGE_SIZES.includes(rawPageSize as (typeof ALLOWED_PAGE_SIZES)[number])
    ? rawPageSize
    : DEFAULT_PAGE_SIZE;

  const str = (key: string) => (typeof params[key] === "string" && params[key] ? (params[key] as string) : undefined);
  const filters = { q: str("q")?.trim() || undefined, from: str("from"), to: str("to") };
  const isFiltered = Boolean(filters.q || filters.from || filters.to);

  const [rows, total] = await Promise.all([
    listAuditLogs(page, pageSize, filters),
    auditLogCount(filters),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Audit Trail"
        title="Activity Logs"
        description="Append-only audit trail. Entries cannot be edited or deleted through the application."
      />

      {/* Filters (GET form → server-rendered results; query params persist via pagination) */}
      <ClientNavForm
        action="/activity-logs"
        className="grid grid-cols-1 gap-3 rounded-lg border border-brand-200 bg-white px-4 py-3 shadow-xs sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="lg:col-span-2">
          <label
            htmlFor="audit-q"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"
          >
            Search
          </label>
          <input
            id="audit-q"
            name="q"
            type="search"
            defaultValue={filters.q ?? ""}
            placeholder="Action, entity or user…"
            className="h-9 w-full rounded-md border border-brand-200 bg-white px-2.5 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none focus:ring-1 focus:ring-action-500"
          />
        </div>
        <div>
          <label
            htmlFor="audit-from"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"
          >
            From
          </label>
          <input
            id="audit-from"
            name="from"
            type="date"
            defaultValue={filters.from ?? ""}
            className="h-9 w-full rounded-md border border-brand-200 bg-white px-2.5 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none focus:ring-1 focus:ring-action-500"
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="audit-to"
              className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"
            >
              To
            </label>
            <input
              id="audit-to"
              name="to"
              type="date"
              defaultValue={filters.to ?? ""}
              className="h-9 w-full rounded-md border border-brand-200 bg-white px-2.5 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none focus:ring-1 focus:ring-action-500"
            />
          </div>
          <button type="submit" className={buttonStyles("secondary", "sm")}>
            Filter
          </button>
        </div>
      </ClientNavForm>

      <Card>
        <CardHeader
          title="Recent activity"
          description={
            isFiltered
              ? `${total.toLocaleString("en-PH")} matching entr${total === 1 ? "y" : "ies"}.`
              : `${total.toLocaleString("en-PH")} audit entr${total === 1 ? "y" : "ies"} recorded.`
          }
          icon={<History aria-hidden="true" className="h-4 w-4" />}
          actions={
            isFiltered ? (
              <Link href="/activity-logs" className="text-xs font-medium text-action-700 hover:text-action-800">
                Clear filters
              </Link>
            ) : undefined
          }
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
                title={
                  isFiltered
                    ? "No entries match the filters"
                    : page > 1 && total > 0
                      ? "No entries on this page"
                      : "No audit entries"
                }
                description={
                  isFiltered
                    ? "Try a different search term or widen the date range."
                    : page > 1 && total > 0
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
