import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasUserPermission } from "@/lib/permissions";
import { canViewStudentDevelopment } from "@/lib/scope";
import { resolveDashboard } from "@/lib/dashboard";
import {
  recentNotifications,
  unreadNotificationCount,
  adviserSectionsOverview,
  guidanceDashboardData,
  healthStats,
  listHealthRecords,
} from "@/lib/queries";
import { Card, CardHeader } from "@/components/ui/card";
import { SCHOOL } from "@/lib/constants";
import { dashboardData } from "@/lib/dashboard-data";
import { officerDashboardData } from "@/lib/employees";
import { OfficerDashboard } from "@/components/dashboard/officer";
import { GuidanceDashboard } from "@/components/dashboard/guidance";
import { NurseDashboard } from "@/components/dashboard/nurse";
import {
  BarangayDistribution,
  EducationDistribution,
  KpiGrid,
  SectionCoverageTable,
  BehaviorConcernsCard,
  OperationalBanner,
  RecentActivity,
  RecentNotifications,
  RecordStatusCard,
  SystemStatusCard,
  ValidationQueueCard,
} from "@/components/dashboard/primitives";
import ForecastPanel from "@/components/forecast/forecast-panel";
import { summarizeDashboard } from "@/actions/ai";
import { AiAnalysisPanel } from "@/components/ai/ai-analysis-panel";

/**
 * Authenticated dashboard.
 *
 * The destination and the view both come from `resolveDashboard()` — the ONE
 * role-resolution helper used by login, the proxy and the sidebar. Privileged
 * widgets are gated by the same permission map the module pages enforce, so a
 * role can no longer see (or be linked into) another role's data.
 */
export default async function AppDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolution = resolveDashboard(user);

  const sp = await searchParams;
  const deniedParam = sp.denied;
  const denied =
    typeof deniedParam === "string" && deniedParam.trim() !== ""
      ? deniedParam
      : undefined;

  // Controlled authorization feedback (set by requirePermission/proxy).
  const deniedNotice = denied ? (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        You do not have access to that module with your current role. Ask an
        administrator if you need it enabled.
      </span>
    </div>
  ) : null;

  // Admin Officer gets an employee-records-only dashboard: no student queries
  // run at all on this render path.
  if (resolution.kind === "admin_officer") {
    const officerData = await officerDashboardData();
    return (
      <div className="space-y-5">
        {deniedNotice}
        <OfficerDashboard data={officerData} user={user} />
      </div>
    );
  }

  // Guidance Office dashboard — confidential incident work only.
  if (resolution.kind === "guidance") {
    const incidents = await guidanceDashboardData(user);
    return (
      <div className="space-y-5">
        {deniedNotice}
        <GuidanceDashboard
          user={user}
          resolution={resolution}
          incidents={incidents}
        />
      </div>
    );
  }

  // Nurse dashboard — health & nutrition only.
  if (resolution.kind === "nurse") {
    const [stats, records] = await Promise.all([
      healthStats(),
      listHealthRecords(5),
    ]);
    return (
      <div className="space-y-5">
        {deniedNotice}
        <NurseDashboard resolution={resolution} stats={stats} records={records} />
      </div>
    );
  }

  const [data, notifications, unread, adviserSections] = await Promise.all([
    dashboardData(user),
    recentNotifications(user.id, 4),
    unreadNotificationCount(user.id),
    adviserSectionsOverview(user),
  ]);

  const canReview = hasUserPermission(user.roles, "verification.review");
  const canViewDuplicates = hasUserPermission(user.roles, "duplicates.view");
  const canViewBehavior =
    hasUserPermission(user.roles, "behavior.view") &&
    canViewStudentDevelopment(user);
  const canForecast = hasUserPermission(user.roles, "reports.view");

  const openConcernsTotal = data.openConcerns.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="space-y-5">
      {/* ------------------------- Page header ------------------------- */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-brand-600">{resolution.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900 sm:text-[28px]">
            {resolution.title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#64748B]">
            {resolution.description} {SCHOOL.shortName}.
          </p>
        </div>
        <div className="leading-tight md:text-right">
          <div className="text-sm font-semibold text-brand-900">
            School Year {new Date().getFullYear()}–{new Date().getFullYear() + 1}
          </div>
          <div className="mt-0.5 text-xs text-[#64748B]">
            {new Date().toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
      </div>

      {deniedNotice}

      {/* ---------------------------- KPI grid ---------------------------- */}
      <KpiGrid kpis={data.kpis} />

      {/* AI narrative summary of the same KPI/distribution dataset —
          interpretation labelled as such, scoped to the viewer's data. */}
      {canForecast ? (
        <AiAnalysisPanel
          feature="dashboardReport"
          action={summarizeDashboard}
          hidden={{}}
          triggerLabel="Summarize this overview"
          pendingLabel="Summarizing overview..."
        />
      ) : null}

      {/* ----------------------- Operational banner ----------------------- */}
      <OperationalBanner
        registered={data.system.totalRecords}
        verified={data.verification.verified}
        barangayCount={data.byGradeLevel.length}
      />

      {/* --------------------- Main two-column layout --------------------- */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-3">
        {/* ------------------------- Main column ------------------------- */}
        <div className="space-y-5 xl:col-span-2">
          {adviserSections.length > 0 ? (
            <Card>
              <CardHeader
                title="My Sections"
                description="Sections you advise and their active enrollment."
                icon={<Users aria-hidden="true" className="h-4 w-4" />}
              />
              <ul className="divide-y divide-brand-100 px-4 pb-2 sm:px-5">
                {adviserSections.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-3 last:pb-0"
                  >
                    <span className="min-w-0 font-medium text-brand-900">
                      {s.gradeLevelName} — {s.name}
                      <span className="ml-2 text-xs font-normal text-[#64748B]">
                        SY {s.schoolYear}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-[#64748B]">
                      <span className="numeric font-semibold text-brand-900">
                        {s.studentCount}
                      </span>
                      active
                      <Link
                        href={`/students?section=${s.id}`}
                        className="font-medium text-action-700 hover:text-action-800"
                      >
                        View
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <BarangayDistribution rows={data.byGradeLevel} />

          {canViewStudentDevelopment(user) ? (
            <SectionCoverageTable rows={data.sectionCoverage} />
          ) : null}

          {canViewBehavior ? (
            <BehaviorConcernsCard
              counts={data.openConcerns}
              openTotal={openConcernsTotal}
            />
          ) : null}

          {/* Academic performance forecast (plan §24.1 — after coverage) */}
          {canForecast ? <ForecastPanel /> : null}

          <RecentActivity items={data.activity} />
        </div>

        {/* ------------------------- Right column ------------------------- */}
        <div className="space-y-5">
          <EducationDistribution rows={data.enrollment} />
          {canReview || canViewDuplicates ? (
            <ValidationQueueCard counts={data.verification} canReview={canReview} />
          ) : null}
          <RecordStatusCard rows={data.recordStatus} />
          <RecentNotifications items={notifications} />
          <SystemStatusCard status={data.system} notifications={unread} />
        </div>
      </div>
    </div>
  );
}
