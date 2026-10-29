import { redirect } from "next/navigation";
import Link from "next/link";
import { HeartHandshake, ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  listBehaviorCategories,
  listGuidanceIncidents,
} from "@/lib/queries";
import { canViewConfidentialBehavior } from "@/lib/scope";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";
import { buttonStyles } from "@/components/ui/button";

export const metadata = { title: "Guidance Office · Records Management System" };

const STATUS_TONE: Record<string, "verified" | "pending" | "info"> = {
  resolved: "verified",
  monitored: "pending",
  open: "info",
};

/**
 * Guidance Office — student behavioral/disciplinary incidents.
 *
 * Access control is enforced server-side, twice:
 *   1. route guard: behavior.view AND the guidance-confidential role set
 *      (guidance / admin / school_admin) — everyone else redirects;
 *   2. the query: `confidentialBehaviorFilter` keeps incident rows out of any
 *      role that may not read them, so a forged URL can never list them.
 */
export default async function GuidancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "behavior.view") || !canViewConfidentialBehavior(user)) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const param = (key: string): string | undefined => {
    const v = sp[key];
    return typeof v === "string" && v.trim() !== "" ? v : undefined;
  };
  const q = param("q");
  const categoryId = param("type");
  const status = param("status");

  const [{ rows, total, page, pageSize }, categories] = await Promise.all([
    listGuidanceIncidents(user, { q, categoryId, status }),
    listBehaviorCategories(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student Development"
        title="Guidance Office"
        description="Behavioral and disciplinary incidents with the interventions taken. Records are confidential — visible only to the Guidance Counselor and the administration."
        actions={
          <Link
            href="/guidance/incidents/new"
            className={buttonStyles("primary", "sm")}
          >
            Record incident
          </Link>
        }
      />

      {/* Filters (GET form → server-rendered results) */}
      <form
        method="get"
        action="/guidance"
        className="grid grid-cols-1 gap-3 rounded-lg border border-brand-200 bg-white px-4 py-3 shadow-xs sm:grid-cols-3"
      >
        <div>
          <label
            htmlFor="gi-q"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"
          >
            Search student
          </label>
          <input
            id="gi-q"
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder="Name or student number…"
            className="h-9 w-full rounded-md border border-brand-200 bg-white px-2.5 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none focus:ring-1 focus:ring-action-500"
          />
        </div>
        <div>
          <label
            htmlFor="gi-type"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"
          >
            Incident type
          </label>
          <select
            id="gi-type"
            name="type"
            defaultValue={categoryId ?? ""}
            className="h-9 w-full rounded-md border border-brand-200 bg-white px-2.5 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none focus:ring-1 focus:ring-action-500"
          >
            <option value="">All incident types</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="gi-status"
              className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"
            >
              Status
            </label>
            <select
              id="gi-status"
              name="status"
              defaultValue={status ?? "all"}
              className="h-9 w-full rounded-md border border-brand-200 bg-white px-2.5 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none focus:ring-1 focus:ring-action-500"
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="monitored">Monitored</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <button type="submit" className={buttonStyles("secondary", "sm")}>
            Filter
          </button>
        </div>
      </form>

      <Card>
        <CardHeader
          title="Incident records"
          description={q || categoryId || (status && status !== "all")
            ? `${total} matching record${total === 1 ? "" : "s"}.`
            : `${total} record${total === 1 ? "" : "s"}, most recent first.`}
          icon={<HeartHandshake aria-hidden="true" className="h-4 w-4" />}
        />
        <TableWrap minWidth={960}>
          <thead>
            <tr>
              <Th>Student</Th>
              <Th>Section</Th>
              <Th>Incident</Th>
              <Th>Type</Th>
              <Th>Date</Th>
              <Th>Intervention</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {rows.length === 0 ? (
              <TableEmptyState
                colSpan={8}
                icon={<HeartHandshake className="h-10 w-10" />}
                title={q || categoryId || (status && status !== "all") ? "No incidents match the filters" : "No incidents recorded yet"}
                description={
                  q || categoryId || (status && status !== "all")
                    ? "Try a different search term or clear the filters."
                    : "Incident records appear here once recorded through the Guidance Office."
                }
              />
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-brand-50/70">
                  <Td>
                    <Link
                      href={`/students/${r.studentId}`}
                      className="font-medium text-brand-900 hover:text-action-700"
                    >
                      <span className="numeric text-xs font-semibold text-[#64748B]">
                        {r.studentNumber}
                      </span>
                      <span className="ml-2">
                        {r.lastName}, {r.firstName}
                      </span>
                    </Link>
                  </Td>
                  <Td className="text-xs text-brand-600">{r.sectionName ?? "—"}</Td>
                  <Td className="max-w-[260px] truncate text-xs text-brand-600">
                    <span title={r.incident}>{r.incident}</span>
                  </Td>
                  <Td className="text-xs text-brand-700">{r.categoryName}</Td>
                  <Td className="text-xs text-brand-600">{formatDate(r.date)}</Td>
                  <Td className="max-w-[220px] truncate text-xs text-brand-600">
                    {r.intervention ? <span title={r.intervention}>{r.intervention}</span> : "—"}
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5">
                      {r.confidential ? (
                        <ShieldAlert
                          aria-label="Confidential record"
                          className="h-3.5 w-3.5 text-brand-400"
                        />
                      ) : null}
                      <Badge tone={STATUS_TONE[r.status] ?? "info"}>
                        {r.status}
                      </Badge>
                    </span>
                  </Td>
                  <Td align="right">
                    <Link
                      href={`/guidance/incidents/${r.id}/edit`}
                      className="text-xs font-medium text-action-700 hover:text-action-800"
                    >
                      Edit
                    </Link>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
        {rows.length > 0 && total > pageSize ? (
          <p className="px-4 py-2 text-xs text-[#64748B]">
            Showing {rows.length} of {total} records — page {page}. Narrow the filters to see
            specific records.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
