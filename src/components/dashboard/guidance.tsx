import Link from "next/link";
import { HeartHandshake, ShieldAlert } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";
import { buttonStyles } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, fullName } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";
import type { guidanceDashboardData } from "@/lib/queries";
import type { DashboardResolution } from "@/lib/dashboard";

type GuidanceDashboardData = Awaited<ReturnType<typeof guidanceDashboardData>>;

const STATUS_TONE: Record<string, "verified" | "pending" | "info"> = {
  resolved: "verified",
  monitored: "pending",
  open: "info",
};

/**
 * Guidance Counselor dashboard — confidential Guidance Office work only.
 *
 * The page resolves this view only for the guidance role; the incident data
 * itself is fetched through `listGuidanceIncidents`, which applies the
 * confidential-row filter and row scope server-side.
 */
export function GuidanceDashboard({
  user,
  resolution,
  incidents,
}: {
  user: SessionUser;
  resolution: DashboardResolution;
  incidents: GuidanceDashboardData;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-brand-600">{resolution.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900 sm:text-[28px]">
            {resolution.title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#64748B]">
            {resolution.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/guidance/incidents/new" className={buttonStyles("primary", "sm")}>
            Record incident
          </Link>
          <Link href="/guidance" className={buttonStyles("secondary", "sm")}>
            Open Guidance Office
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-400">
            Incidents on file
          </p>
          <p className="numeric mt-1 text-2xl font-bold text-brand-900">
            {incidents.total}
          </p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-400">
            Open
          </p>
          <p className="numeric mt-1 text-2xl font-bold text-brand-900">
            {incidents.open}
          </p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-400">
            Monitored
          </p>
          <p className="numeric mt-1 text-2xl font-bold text-brand-900">
            {incidents.monitored}
          </p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-400">
            Resolved
          </p>
          <p className="numeric mt-1 text-2xl font-bold text-brand-900">
            {incidents.resolved}
          </p>
        </Card>
      </div>

      <p className="text-xs text-[#64748B]">
        Signed in as {user.firstName} {user.lastName} — confidential records are
        visible only to the Guidance Counselor and administration.
      </p>

      <Card>
        <CardHeader
          title="Recent incidents"
          description="Most recent confidential incidents recorded by the Guidance Office."
          icon={<ShieldAlert aria-hidden="true" className="h-4 w-4" />}
          actions={
            <Link
              href="/guidance"
              className="text-xs font-semibold text-action-700 hover:text-action-800"
            >
              View all
            </Link>
          }
        />
        <CardBody className="pt-0">
          <TableWrap minWidth={760}>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Student</Th>
                <Th>Incident</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {incidents.recent.length === 0 ? (
                <TableEmptyState
                  colSpan={4}
                  icon={<HeartHandshake className="h-10 w-10" />}
                  title="No incidents recorded"
                  description="New Guidance Office incidents will appear here."
                />
              ) : (
                incidents.recent.map((row) => (
                  <tr key={row.id}>
                    <Td className="whitespace-nowrap text-xs text-[#64748B]">
                      {formatDate(row.date)}
                    </Td>
                    <Td>
                      <Link
                        href={`/students/${row.studentId}`}
                        className="font-medium text-brand-900 hover:text-action-700"
                      >
                        {fullName({ firstName: row.firstName, lastName: row.lastName })}
                      </Link>
                      <div className="text-[11px] text-[#64748B]">
                        {row.studentNumber}
                        {row.gradeLevelName ? ` • ${row.gradeLevelName}` : ""}
                        {row.sectionName ? ` — ${row.sectionName}` : ""}
                      </div>
                    </Td>
                    <Td>
                      <span className="text-sm text-brand-800">{row.categoryName}</span>
                    </Td>
                    <Td>
                      <Badge tone={STATUS_TONE[row.status] ?? "info"}>
                        {row.status}
                      </Badge>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </TableWrap>
        </CardBody>
      </Card>
    </div>
  );
}
