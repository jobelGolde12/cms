import { redirect } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { monitoringList } from "@/lib/queries";
import {
  MONITORING_TYPES,
  MONITORING_TYPE_LABELS,
  type MonitoringType,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateTime } from "@/lib/utils";

const ALIASES: Record<string, MonitoringType> = {
  osy: "out_of_school_youth",
  education: "education",
  eccd: "eccd",
  disability: "disability",
  general: "general",
};

export default async function MonitoringTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { type } = await params;

  const monitoringType = ALIASES[type];
  if (!monitoringType || !MONITORING_TYPES.includes(monitoringType)) notFound();

  const list = await monitoringList(user, monitoringType);

  return (
    <div className="space-y-6">
      <Link
        href="/monitoring"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 transition-colors hover:text-brand-900"
      >
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
        Back to Monitoring
      </Link>

      <PageHeader
        eyebrow="Barangay Monitoring"
        title={MONITORING_TYPE_LABELS[monitoringType]}
        description={
          list.length > 0
            ? `${list.length} record${list.length === 1 ? "" : "s"} in your scope.`
            : "Records in your scope will appear here."
        }
      />

      <section className="rounded-lg border border-brand-200 bg-white shadow-xs">
        <TableWrap minWidth={760}>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Name</Th>
              <Th>Barangay</Th>
              <Th>Observed</Th>
              <Th>Status</Th>
              <Th>Remarks</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {list.length === 0 ? (
              <TableEmptyState
                colSpan={6}
                icon={<ClipboardList className="h-10 w-10" />}
                title="No monitoring records found"
                description={`There are no ${MONITORING_TYPE_LABELS[monitoringType].toLowerCase()} cases in your scope yet.`}
              />
            ) : (
              list.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-brand-50/70">
                  <Td>
                    <Link
                      href={`/children/${item.childId}`}
                      className="numeric font-semibold text-brand-900 hover:text-action-700"
                    >
                      {item.childCode}
                    </Link>
                  </Td>
                  <Td>
                    {item.lastName}, {item.firstName}
                  </Td>
                  <Td className="text-brand-500">{item.barangayName}</Td>
                  <Td className="text-brand-600">{formatDateTime(item.observedAt)}</Td>
                  <Td>
                    <Badge tone={item.status === "open" ? "pending" : item.status === "in_progress" ? "info" : "verified"}>
                      {item.status.replace(/_/g, " ")}
                    </Badge>
                  </Td>
                  <Td className="max-w-56 truncate text-brand-500">{item.remarks ?? "—"}</Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
      </section>
    </div>
  );
}
