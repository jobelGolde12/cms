import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listInterventions } from "@/lib/queries";
import {
  INTERVENTION_STATUSES,
  INTERVENTION_STATUS_LABELS,
  type InterventionStatus,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";

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
      <div className="flex items-center gap-2">
        <Link href="/monitoring" className="text-brand-500 hover:text-brand-800">← Monitoring</Link>
      </div>
      <div>
        <h1 className="text-xl font-extrabold text-brand-900">Interventions</h1>
        <p className="mt-1 text-sm text-brand-500">Educational and support interventions with follow-up tracking.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", ...INTERVENTION_STATUSES].map((s) => (
          <Link
            key={s}
            href={`/monitoring/interventions?status=${s}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              status === s
                ? "border-brand-900 bg-brand-900 text-white"
                : "border-brand-200 bg-white text-brand-600 hover:border-brand-400"
            }`}
          >
            {s === "all" ? "All" : INTERVENTION_STATUS_LABELS[s as InterventionStatus]}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-brand-200 bg-white shadow-sm">
          <EmptyState title="No interventions found" description="Interventions created for children in your scope appear here." />
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((item) => (
            <div key={item.id} className="rounded-xl border border-brand-200 bg-white shadow-sm p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-brand-900">{item.interventionType}</div>
                  <div className="text-xs text-brand-500 mt-0.5">
                    <Link href={`/children/${item.childId}`} className="font-mono text-brand-700 hover:text-action-700">
                      {item.childCode}
                    </Link>
                    {" · "}{item.lastName}, {item.firstName}{" · "}{item.barangayName}
                  </div>
                  <p className="mt-2 text-sm text-brand-600">{item.description}</p>
                  <div className="mt-1 text-xs text-brand-400">
                    {item.startDate ? `Started ${item.startDate}` : "Not started"}
                    {item.targetDate ? ` · target ${item.targetDate}` : ""}
                    {item.completedDate ? ` · completed ${item.completedDate}` : ""}
                  </div>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-2">
                  <Badge tone={item.status === "completed" ? "verified" : item.status === "cancelled" ? "neutral" : "info"}>
                    {INTERVENTION_STATUS_LABELS[item.status as InterventionStatus] ?? item.status}
                  </Badge>
                  {item.priority ? (
                    <span className="text-xs text-brand-500">Priority: {item.priority}</span>
                  ) : null}
                  <span className="text-xs text-brand-500">{item.followupCount} follow-up(s)</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
