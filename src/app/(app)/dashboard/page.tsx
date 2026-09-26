import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/permissions";
import { recentNotifications, unreadNotificationCount } from "@/lib/queries";
import { MUNICIPALITY } from "@/lib/constants";
import { dashboardData } from "@/lib/dashboard-data";
import {
  BarangayDistribution,
  EducationDistribution,
  KpiGrid,
  MonitoringBarangayTable,
  MonitoringCasework,
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

  const canReview = hasPermission(user.role, "validation.review" as Permission);
  const canMonitor = hasPermission(user.role, "monitoring.view" as Permission);

  const openMonitoringTotal = data.monitoringTypeCounts.reduce(
    (sum, row) => sum + row.value,
    0,
  );

  return (
    <div className="space-y-5">
      {/* ------------------------- Page header ------------------------- */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-action-700">
            Child Mapping Overview
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900 sm:text-[28px]">
            Child Mapping &amp; Demographics Overview
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-brand-500">
            Current child registration, validation, education status, and
            intervention monitoring across {MUNICIPALITY.shortName}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-600">
            Current Cycle: {new Date().getFullYear()}
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
        verified={data.validation.verified}
        barangayCount={data.byBarangay.length}
      />

      {/* --------------------- Main two-column layout --------------------- */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-3">
        {/* ------------------------- Main column ------------------------- */}
        <div className="space-y-5 xl:col-span-2">
          <BarangayDistribution rows={data.byBarangay} />

          {canMonitor ? (
            <>
              <MonitoringBarangayTable rows={data.monitoringByBarangay} />
              <MonitoringCasework
                counts={data.monitoringTypeCounts}
                openTotal={openMonitoringTotal}
              />
            </>
          ) : null}

          <RecentActivity items={data.activity} />
        </div>

        {/* ------------------------- Right column ------------------------- */}
        <div className="space-y-5">
          <EducationDistribution rows={data.education} />
          <ValidationQueueCard counts={data.validation} canReview={canReview} />
          <RecordStatusCard rows={data.recordStatus} />
          <RecentNotifications items={notifications} />
          <SystemStatusCard status={data.system} notifications={unread} />
        </div>
      </div>
    </div>
  );
}
