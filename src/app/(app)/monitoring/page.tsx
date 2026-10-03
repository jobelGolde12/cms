import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Accessibility,
  ArrowRight,
  Blocks,
  BookOpen,
  ClipboardList,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { monitoringOverview } from "@/lib/queries";
import { MONITORING_TYPES, MONITORING_TYPE_LABELS, type MonitoringType } from "@/lib/constants";
import { PageHeader } from "@/components/ui/page-header";

const HREFS: Record<MonitoringType, string> = {
  education: "/monitoring/education",
  out_of_school_youth: "/monitoring/osy",
  eccd: "/monitoring/eccd",
  disability: "/monitoring/disability",
  general: "/monitoring/general",
};

/** Per-type iconography so the tiles scan quickly (same icon reused in tiles + lists). */
const TYPE_ICONS: Record<MonitoringType, LucideIcon> = {
  education: BookOpen,
  out_of_school_youth: GraduationCap,
  eccd: Blocks,
  disability: Accessibility,
  general: ClipboardList,
};

const TYPE_CHIP: Record<MonitoringType, string> = {
  education: "bg-sky-100 text-sky-700",
  out_of_school_youth: "bg-amber-100 text-amber-700",
  eccd: "bg-violet-100 text-violet-700",
  disability: "bg-emerald-100 text-emerald-700",
  general: "bg-brand-100 text-brand-700",
};

export default async function MonitoringPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const stats = await monitoringOverview(user);

  const counts: Record<MonitoringType, number> = {
    education: stats.education,
    out_of_school_youth: stats.osy,
    eccd: stats.eccd,
    disability: stats.disability,
    general: stats.general,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Barangay Monitoring"
        title="Monitoring Cases"
        description={`${stats.openRecords} open monitoring record${stats.openRecords === 1 ? "" : "s"} in your scope. Select a case type to review records.`}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MONITORING_TYPES.map((t) => {
          const Icon = TYPE_ICONS[t];
          return (
            <Link
              key={t}
              href={HREFS[t]}
              className="group rounded-lg border border-brand-200 bg-white p-5 shadow-xs transition-colors hover:border-brand-300 hover:bg-brand-50/50 focus-visible:outline-none"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  aria-hidden="true"
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${TYPE_CHIP[t]}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="numeric text-3xl font-bold tracking-tight text-brand-900">
                  {counts[t]}
                </span>
              </div>
              <h2 className="mt-3 text-[13px] font-semibold uppercase tracking-wide text-brand-500">
                {MONITORING_TYPE_LABELS[t]}
              </h2>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-action-700">
                View records
                <ArrowRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
