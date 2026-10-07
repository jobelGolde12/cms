import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recentNotifications, unreadNotificationCount } from "@/lib/queries";
import { SCHOOL } from "@/lib/constants";
import { dashboardData } from "@/lib/dashboard-data";
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

export default async function AppDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [data, notifications, unread] = await Promise.all([
    dashboardData(user),
    recentNotifications(user.id, 4),
    unreadNotificationCount(user.id),
  ]);

  const canReview = hasPermission(user.role, "verification.review");
  const canDevelopment = hasPermission(user.role, "behavior.view");

  const openConcernsTotal = data.openConcerns.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="space-y-5">
      {/* ------------------------- Page header ------------------------- */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-action-700">
            Student Records Overview
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900 sm:text-[28px]">
            Enrollment &amp; Performance Overview
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-brand-500">
            Current enrollment, record verification, academic performance, and
            student development at {SCHOOL.shortName}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-600">
            Current School Year: {new Date().getFullYear()}-{new Date().getFullYear() + 1}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-600">
            {new Date().toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* ---------------------------- KPI grid ---------------------------- */}
      <KpiGrid kpis={data.kpis} />

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
          <BarangayDistribution rows={data.byGradeLevel} />

          {canDevelopment ? (
            <>
              <SectionCoverageTable rows={data.sectionCoverage} />
              <BehaviorConcernsCard
                counts={data.openConcerns}
                openTotal={openConcernsTotal}
              />
            </>
          ) : null}

          <RecentActivity items={data.activity} />
        </div>

        {/* ------------------------- Right column ------------------------- */}
        <div className="space-y-5">
          <EducationDistribution rows={data.enrollment} />
          <ValidationQueueCard counts={data.verification} canReview={canReview} />
          <RecordStatusCard rows={data.recordStatus} />
          <RecentNotifications items={notifications} />
          <SystemStatusCard status={data.system} notifications={unread} />
        </div>
      </div>
    </div>
  );
}
