import type { ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  ClipboardCheck,
  Clock,
  Copy,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Map,
  Plus,
  QrCode,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ActivityItem,
  BarangayRow,
  DistributionRow,
  Kpi,
  MonitoringBarangayRow,
  SystemStatus,
  ValidationCounts,
} from "@/lib/dashboard-data";
import {
  activityIcon,
  activityTitle,
  activityTone,
  formatRelativeTime,
} from "@/lib/dashboard-data";

/* -------------------------------------------------------------------------- */
/*  Panel shell — compact white card with section header                      */
/* -------------------------------------------------------------------------- */

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-brand-200 bg-white shadow-xs",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-brand-100 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-brand-900">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-brand-500">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className={cn("px-4 py-3", bodyClassName)}>{children}</div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Small helpers                                                             */
/* -------------------------------------------------------------------------- */

function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-action-700 hover:text-action-800"
    >
      {children}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

/** Icon registry shared by dashboard sections (names cross the RSC boundary). */
const SECTION_ICONS: Record<string, LucideIcon> = {
  userPlus: UserPlus,
  children: ClipboardCheck,
  archive: Archive,
  validation: ShieldCheck,
  check: Check,
  alert: AlertTriangle,
  clock: Clock,
  duplicates: Copy,
  monitoring: BarChart3,
  plus: Plus,
  reports: FileText,
  qr: QrCode,
  users: Users,
  settings: Settings,
  activity: Activity,
  bell: Bell,
  bookOpen: BookOpen,
  help: HelpCircle,
  dashboard: LayoutDashboard,
  map: Map,
};

export function DashIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = SECTION_ICONS[name] ?? Activity;
  return <Icon aria-hidden="true" className={className} />;
}

const KPI_TONES: Record<Kpi["tone"], { icon: string; bar: string }> = {
  navy: { icon: "text-brand-800 bg-brand-100", bar: "bg-brand-700" },
  blue: { icon: "text-sky-700 bg-sky-100", bar: "bg-sky-600" },
  green: { icon: "text-emerald-700 bg-emerald-100", bar: "bg-emerald-600" },
  amber: { icon: "text-amber-700 bg-amber-100", bar: "bg-amber-500" },
  red: { icon: "text-red-700 bg-red-100", bar: "bg-red-600" },
  slate: { icon: "text-brand-600 bg-brand-100", bar: "bg-brand-400" },
};

/* -------------------------------------------------------------------------- */
/*  KPI grid                                                                  */
/* -------------------------------------------------------------------------- */

export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {kpis.map((kpi) => {
        const tone = KPI_TONES[kpi.tone];
        return (
          <article
            key={kpi.key}
            className="rounded-lg border border-brand-200 bg-white px-4 py-3.5 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
                {kpi.label}
              </h3>
              <span
                className={cn(
                  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                  tone.icon,
                )}
              >
                <DashIcon name={kpi.icon} className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="numeric mt-1.5 text-3xl font-bold tracking-tight text-brand-900">
              {kpi.value}
            </p>
            <p className="mt-0.5 truncate text-xs text-brand-500">
              {kpi.description}
            </p>
            {kpi.progress !== null ? (
              <div
                className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-brand-100"
                role="presentation"
              >
                <div
                  className={cn("h-full rounded-full", tone.bar)}
                  style={{ width: `${Math.min(100, Math.max(2, kpi.progress))}%` }}
                />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Operational banner                                                        */
/* -------------------------------------------------------------------------- */

export function OperationalBanner({
  registered,
  verified,
  barangayCount,
}: {
  registered: number;
  verified: number;
  barangayCount: number;
}) {
  return (
    <section className="rounded-lg bg-brand-900 px-5 py-4 text-white shadow-xs sm:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-400">
            Child Mapping Operations
          </p>
          <h2 className="mt-1 text-base font-semibold sm:text-lg">
            Current Child Registration &amp; Validation Cycle
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-brand-300">
            Monitor registered children, barangay coverage, verification
            progress, and intervention requirements across the municipality.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <p className="numeric text-2xl font-bold">{registered}</p>
            <p className="text-xs text-brand-400">Registered children</p>
          </div>
          <div>
            <p className="numeric text-2xl font-bold">{verified}</p>
            <p className="text-xs text-brand-400">Verified records</p>
          </div>
          <div>
            <p className="numeric text-2xl font-bold">{barangayCount}</p>
            <p className="text-xs text-brand-400">Barangays covered</p>
          </div>
          <Link
            href="/children"
            className="rounded-md bg-white px-3.5 py-2 text-xs font-semibold text-brand-900 transition-colors hover:bg-brand-100"
          >
            View Child Registry
          </Link>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Barangay distribution                                                     */
/* -------------------------------------------------------------------------- */

export function BarangayDistribution({ rows }: { rows: BarangayRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const visible = rows.slice(0, 8);
  const hidden = rows.length - visible.length;

  return (
    <Panel
      title="Children by Barangay"
      description="Distribution of registered children across barangays."
      action={rows.length > 0 ? <PanelLink href="/children">View registry</PanelLink> : undefined}
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-brand-400">No records yet.</p>
      ) : (
        <>
          <ul className="space-y-2.5">
            {visible.map((row) => (
              <li key={row.name} className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-action-600"
                />
                <span
                  className="w-32 min-w-0 shrink-0 truncate text-xs text-brand-600 sm:w-40"
                  title={row.name}
                >
                  {row.name}
                </span>
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-brand-100">
                  <div
                    className="h-full rounded-full bg-action-600"
                    style={{ width: `${Math.round((row.value / max) * 100)}%` }}
                  />
                </div>
                <span className="numeric w-8 shrink-0 text-right text-xs font-semibold text-brand-900">
                  {row.value}
                </span>
              </li>
            ))}
          </ul>
          {hidden > 0 ? (
            <p className="mt-3 border-t border-brand-100 pt-2.5 text-xs text-brand-500">
              + {hidden} more barangay{hidden === 1 ? "" : "s"} in the{" "}
              <Link href="/children" className="font-medium text-action-700 hover:text-action-800">
                full registry
              </Link>
            </p>
          ) : null}
        </>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*  Record status                                                             */
/* -------------------------------------------------------------------------- */

const RECORD_TONES: Record<string, string> = {
  Verified: "bg-emerald-500",
  "Pending Validation": "bg-amber-500",
  "Needs Correction": "bg-red-500",
  Draft: "bg-brand-300",
};

export function RecordStatusCard({ rows }: { rows: DistributionRow[] }) {
  return (
    <Panel
      title="Record Status"
      description="Workflow state of registered records."
      action={rows.length > 0 ? <PanelLink href="/children?status=pending_validation">Review</PanelLink> : undefined}
    >
      <ul className="divide-y divide-brand-100">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <span className="flex min-w-0 items-center gap-2 text-xs text-brand-600">
              <span
                aria-hidden="true"
                className={cn("h-1.5 w-1.5 shrink-0 rounded-full", RECORD_TONES[row.label] ?? "bg-brand-300")}
              />
              <span className="truncate">{row.label}</span>
            </span>
            <span className="numeric shrink-0 text-sm font-semibold text-brand-900">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*  Education distribution                                                    */
/* -------------------------------------------------------------------------- */

const EDU_BAR: Record<string, string> = {
  Enrolled: "bg-emerald-600",
  "Out-of-School": "bg-red-500",
  "Not Yet in School": "bg-sky-500",
  Graduated: "bg-brand-700",
  Unknown: "bg-brand-300",
};

export function EducationDistribution({ rows }: { rows: DistributionRow[] }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  const withValues = rows.filter((r) => r.value > 0);

  return (
    <Panel
      title="Education Status Distribution"
      description="Current schooling status of registered children."
      action={total > 0 ? <PanelLink href="/monitoring">Open monitoring</PanelLink> : undefined}
    >
      {total === 0 ? (
        <p className="py-6 text-center text-sm text-brand-400">No education records yet.</p>
      ) : (
        <>
          {/* Stacked distribution bar */}
          <div
            className="flex h-2.5 w-full overflow-hidden rounded-full bg-brand-100"
            role="img"
            aria-label={`Education status distribution of ${total} children`}
          >
            {withValues.map((row) => (
              <div
                key={row.label}
                className={cn("h-full", EDU_BAR[row.label] ?? "bg-brand-300")}
                style={{ width: `${(row.value / total) * 100}%` }}
                title={`${row.label}: ${row.value}`}
              />
            ))}
          </div>
          <ul className="mt-3.5 space-y-2">
            {rows.map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-xs text-brand-600">
                  <span
                    aria-hidden="true"
                    className={cn("h-2 w-2 shrink-0 rounded-sm", EDU_BAR[row.label] ?? "bg-brand-300")}
                  />
                  <span className="truncate">{row.label}</span>
                </span>
                <span className="shrink-0 text-xs text-brand-500">
                  <span className="numeric font-semibold text-brand-900">{row.value}</span>
                  <span className="numeric ml-1.5">
                    ({Math.round((row.value / total) * 100)}%)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*  Validation queue                                                          */
/* -------------------------------------------------------------------------- */

export function ValidationQueueCard({
  counts,
  canReview,
}: {
  counts: ValidationCounts;
  canReview: boolean;
}) {
  const rows = [
    { label: "Verified Records", value: counts.verified, tone: "bg-emerald-500" },
    { label: "Pending Validation", value: counts.pending, tone: "bg-amber-500" },
    { label: "Needs Correction", value: counts.needsCorrection, tone: "bg-red-500" },
    { label: "Duplicate Flags", value: counts.duplicateFlags, tone: "bg-brand-400" },
  ];
  const href = canReview ? "/validation" : "/children?status=pending_validation";

  return (
    <Panel
      title="Validation Queue"
      description="Verification progress and review backlog."
      action={<PanelLink href={href}>Open queue</PanelLink>}
    >
      <ul className="divide-y divide-brand-100">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <span className="flex min-w-0 items-center gap-2 text-xs text-brand-600">
              <span
                aria-hidden="true"
                className={cn("h-1.5 w-1.5 shrink-0 rounded-full", row.tone)}
              />
              <span className="truncate">{row.label}</span>
            </span>
            <span className="numeric shrink-0 text-sm font-semibold text-brand-900">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*  Recent activity                                                           */
/* -------------------------------------------------------------------------- */

const ACTIVITY_TONE_STYLES: Record<"green" | "red" | "amber" | "blue" | "gray", string> = {
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  amber: "bg-amber-50 text-amber-700",
  blue: "bg-sky-50 text-sky-700",
  gray: "bg-brand-100 text-brand-600",
};

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <Panel
      title="Recent Activity"
      description="Latest system events from the audit trail."
      action={<PanelLink href="/activity-logs">View all</PanelLink>}
    >
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-brand-400">No activity recorded yet.</p>
      ) : (
        <ul className="divide-y divide-brand-100">
          {items.map((item) => {
            const tone = activityTone(item);
            return (
              <li key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    ACTIVITY_TONE_STYLES[tone],
                  )}
                >
                  <DashIcon name={activityIcon(item)} className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-brand-800">
                    {activityTitle(item)}
                  </p>
                  <p className="mt-0.5 text-[11px] capitalize text-brand-400">
                    {item.entityType.replace(/_/g, " ")}
                  </p>
                </div>
                <time
                  dateTime={new Date(item.createdAt).toISOString()}
                  className="shrink-0 text-[11px] text-brand-400"
                >
                  {formatRelativeTime(item.createdAt)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*  Monitoring summary (barangay coverage table)                              */
/* -------------------------------------------------------------------------- */

export function MonitoringBarangayTable({ rows }: { rows: MonitoringBarangayRow[] }) {
  return (
    <Panel
      title="Barangay Enrollment Coverage"
      description="Registered children and current schooling per barangay."
      action={<PanelLink href="/monitoring">Open monitoring</PanelLink>}
      bodyClassName="px-0 py-0"
    >
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-brand-400">No records yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="border-b border-brand-100 text-[11px] uppercase tracking-wide text-brand-400">
                <th scope="col" className="px-4 py-2 font-semibold">Barangay</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Registered</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Enrolled</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Out-of-School</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {rows.map((row) => {
                const coverage =
                  row.registered > 0
                    ? Math.round((row.enrolled / row.registered) * 100)
                    : 0;
                return (
                  <tr key={row.barangay}>
                    <td className="max-w-[140px] truncate px-4 py-2 text-brand-700" title={row.barangay}>
                      {row.barangay}
                    </td>
                    <td className="numeric px-3 py-2 text-right font-medium text-brand-900">
                      {row.registered}
                    </td>
                    <td className="numeric px-3 py-2 text-right text-emerald-700">
                      {row.enrolled}
                    </td>
                    <td className="numeric px-3 py-2 text-right text-red-700">
                      {row.outOfSchool}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-brand-100">
                          <div
                            className="h-full rounded-full bg-emerald-600"
                            style={{ width: `${Math.min(100, coverage)}%` }}
                          />
                        </div>
                        <span className="numeric w-9 text-right text-brand-500">{coverage}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*  Monitoring casework (open cases by type)                                  */
/* -------------------------------------------------------------------------- */

export function MonitoringCasework({
  counts,
  openTotal,
}: {
  counts: { label: string; value: number }[];
  openTotal: number;
}) {
  const max = Math.max(1, ...counts.map((c) => c.value));
  return (
    <Panel
      title="Open Monitoring Casework"
      description={`${openTotal} open case${openTotal === 1 ? "" : "s"} in your scope.`}
      action={<PanelLink href="/monitoring">View cases</PanelLink>}
    >
      {counts.length === 0 ? (
        <p className="py-6 text-center text-sm text-brand-400">No open monitoring cases.</p>
      ) : (
        <ul className="space-y-2.5">
          {counts.map((row) => (
            <li key={row.label} className="flex items-center gap-3">
              <span className="w-36 min-w-0 shrink-0 truncate text-xs text-brand-600" title={row.label}>
                {row.label}
              </span>
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-brand-100">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${Math.round((row.value / max) * 100)}%` }}
                />
              </div>
              <span className="numeric w-8 shrink-0 text-right text-xs font-semibold text-brand-900">
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*  System status                                                             */
/* -------------------------------------------------------------------------- */

export function SystemStatusCard({
  status,
  notifications,
}: {
  status: SystemStatus;
  notifications: number;
}) {
  const rows = [
    {
      label: "Database",
      value: status.databaseOnline ? "Online" : "Offline",
      ok: status.databaseOnline,
    },
    {
      label: "Active records",
      value: `${status.activeRecords}`,
      ok: true,
    },
    {
      label: "Open monitoring cases",
      value: `${status.openMonitoring}`,
      ok: true,
    },
    {
      label: "Unread notifications",
      value: `${notifications}`,
      ok: notifications === 0,
    },
  ];

  return (
    <Panel
      title="System Status"
      description="Operational health of the platform."
      action={<PanelLink href="/settings">Settings</PanelLink>}
    >
      <ul className="divide-y divide-brand-100">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <span className="text-xs text-brand-600">{row.label}</span>
            <span
              className={cn(
                "flex items-center gap-1.5 text-xs font-semibold",
                row.ok ? "text-emerald-700" : "text-amber-700",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  row.ok ? "bg-emerald-500" : "bg-amber-500",
                )}
              />
              {row.value}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-brand-100 pt-2.5 text-[11px] text-brand-400">
        Sta. Magdalena Child Mapping System — Municipal Government of Sta. Magdalena, Sorsogon
      </p>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*  Notifications preview                                                     */
/* -------------------------------------------------------------------------- */

export function RecentNotifications({
  items,
}: {
  items: {
    id: string;
    title: string;
    message: string | null;
    isRead: boolean;
    createdAt: Date;
    link: string | null;
  }[];
}) {
  return (
    <Panel
      title="Notifications"
      description="Recent alerts addressed to you."
      action={<PanelLink href="/notifications">View all</PanelLink>}
    >
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-brand-400">No notifications yet.</p>
      ) : (
        <ul className="divide-y divide-brand-100">
          {items.map((n) => (
            <li key={n.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                  n.isRead ? "bg-brand-200" : "bg-action-600",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-xs", n.isRead ? "text-brand-500" : "font-medium text-brand-800")}>
                  {n.title}
                </p>
                {n.message ? (
                  <p className="mt-0.5 truncate text-[11px] text-brand-400">{n.message}</p>
                ) : null}
              </div>
              <time
                dateTime={new Date(n.createdAt).toISOString()}
                className="shrink-0 text-[11px] text-brand-400"
              >
                {formatRelativeTime(n.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
