import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listInterventions } from "@/lib/queries";
import {
  INTERVENTION_STATUSES,
  INTERVENTION_STATUS_LABELS,
  type InterventionStatus,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

export default async function InterventionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "all";
  const list = await listInterventions(user, status);

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
        title="Interventions"
        description="Educational and support interventions with follow-up tracking."
      />

      <div className="flex flex-wrap gap-2">
        {["all", ...INTERVENTION_STATUSES].map((s) => (
          <Link
            key={s}
            href={`/monitoring/interventions?status=${s}`}
            aria-pressed={status === s}
            className={cn(
              "inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium transition-colors",
              status === s
                ? "border-brand-900 bg-brand-900 text-white"
                : "border-brand-200 bg-white text-brand-600 hover:border-brand-400",
            )}
          >
            {s === "all" ? "All" : INTERVENTION_STATUS_LABELS[s as InterventionStatus]}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            title="No interventions found"
            description={
              status === "all"
                ? "Interventions created for children in your scope appear here."
                : `No interventions with the selected status. Try switching the filter above.`
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <Card key={item.id}>
              <CardHeader
                title={item.interventionType}
                description={
                  <>
                    <Link
                      href={`/children/${item.childId}`}
                      className="numeric font-semibold text-brand-700 hover:text-action-700"
                    >
                      {item.childCode}
                    </Link>
                    {" · "}
                    {item.lastName}, {item.firstName}
                    {" · "}
                    {item.barangayName}
                  </>
                }
                actions={
                  <div className="flex flex-col items-start gap-1 sm:items-end">
                    <Badge tone={item.status === "completed" ? "verified" : item.status === "cancelled" ? "neutral" : "info"}>
                      {INTERVENTION_STATUS_LABELS[item.status as InterventionStatus] ?? item.status}
                    </Badge>
                    {item.priority ? (
                      <span className="text-xs text-brand-500">Priority: {item.priority}</span>
                    ) : null}
                    <span className="text-xs text-brand-500">{item.followupCount} follow-up(s)</span>
                  </div>
                }
              />
              <div className="px-4 py-3">
                <p className="text-sm text-brand-600">{item.description}</p>
                <div className="mt-1.5 text-xs text-brand-400">
                  {item.startDate ? `Started ${item.startDate}` : "Not started"}
                  {item.targetDate ? ` · target ${item.targetDate}` : ""}
                  {item.completedDate ? ` · completed ${item.completedDate}` : ""}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
