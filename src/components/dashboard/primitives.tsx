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
  ChevronRight,
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
import { DistributionBar } from "./distribution-bar";
import { CountUp } from "./count-up";
import { AnimatedBar, AnimatedStackedBar } from "./animated-bar";
import type {
  ActivityItem,
  DistributionRow,
  GradeLevelRow,
  Kpi,
  SectionCoverageRow,
  SystemStatus,
  VerificationCounts,
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
        "rounded-lg border border-brand-100 bg-white shadow-xs",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-brand-100 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-brand-900">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-[#64748B]">{description}</p>
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
      className="group inline-flex items-center gap-1 text-xs font-medium text-action-700 underline-offset-2 transition-colors duration-150 hover:underline hover:text-action-800"
    >
      <span className="transition-transform duration-200 group-hover:translate-x-0.5">{children}</span>
      <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
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

/* -------------------------------------------------------------------------- */
/*  KPI grid                                                                  */
/* -------------------------------------------------------------------------- */

/*
 * Metric name → number → short context, with a meaningful progress share
 * where one exists. Numbers lead; the icon is a quiet secondary cue, not a
 * decorated tile. Color is reserved for status-relevant tones (verified =
 * success, pending/behavior = warning, etc.); everything else stays in the
 * brand blue. Six metrics read best as two rows of three.
 */
const KPI_TONES: Record<Kpi["tone"], { icon: string; bar: string }> = {
  navy: { icon: "text-brand-700", bar: "bg-brand-600" },
  blue: { icon: "text-brand-500", bar: "bg-brand-500" },
  green: { icon: "text-emerald-600", bar: "bg-emerald-600" },
  amber: { icon: "text-amber-600", bar: "bg-amber-500" },
  red: { icon: "text-red-600", bar: "bg-red-600" },
  slate: { icon: "text-brand-500", bar: "bg-brand-400" },
};

/* Card targets — mapped to the filters that already exist in the registry. */
const KPI_LINKS: Record<string, string> = {
  total: "/students",
  verified: "/students?status=verified",
  pending: "/students?status=pending_validation",
  enrolled: "/students",
  behavior: "/development/behavior",
  interventions: "/development",
};

export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {kpis.map((kpi, i) => {
        const tone = KPI_TONES[kpi.tone];
        const href = KPI_LINKS[kpi.key];
        const card = (
          <article
            className={cn(
              "flex h-full flex-col rounded-lg border border-brand-100 bg-white px-4 py-4 shadow-xs",
              "transition-all duration-200 ease-out",
              href &&
                "group cursor-pointer hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-sm",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="mt-1 flex items-center text-xs font-medium text-[#64748B]">
                {kpi.label}
                {/* Action-needed pulse: only when work is actually waiting. */}
                {kpi.key === "pending" && kpi.value > 0 ? (
                  <span
                    aria-hidden="true"
                    className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"
                  />
                ) : null}
              </h3>
              <span
                className={cn(
                  "shrink-0 transition-opacity duration-150",
                  tone.icon,
                  kpi.tone === "red" && "group-hover:animate-pulse",
                )}
              >
                <DashIcon name={kpi.icon} className="h-4 w-4" />
              </span>
            </div>
            <p className="numeric mt-2 text-3xl font-semibold tracking-tight text-brand-900">
              <CountUp value={kpi.value} delay={i * 60} />
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              {kpi.description}
            </p>
            {kpi.progress !== null ? (
              <AnimatedBar
                widthPercent={kpi.progress}
                className={tone.bar}
                trackClassName="mt-2.5 h-1 w-full max-w-24"
                delay={i * 60 + 250}
              />
            ) : null}
          </article>
        );
        return (
          <div
            key={kpi.key}
            className="rise"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {href ? (
              <Link
                href={href}
                aria-label={`${kpi.label}: ${kpi.value} — ${kpi.description}`}
              >
                {card}
              </Link>
            ) : (
              card
            )}
          </div>
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
    <section className="rounded-lg bg-brand-900 px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 className="text-base font-semibold text-white sm:text-lg">
            Current Enrollment &amp; Verification Cycle
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-brand-300">
            Monitor enrolled students, grade-level coverage, verification
            progress, and student development across the school.
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-y-1 text-sm text-brand-300">
            <Link
              href="/students"
              className="rounded-md transition-colors duration-150 hover:text-white"
            >
              <span className="numeric font-semibold text-white">
                <CountUp value={registered} duration={800} />
              </span>{" "}
              enrolled
            </Link>
            <span aria-hidden="true" className="mx-1.5 text-brand-500">·</span>
            <Link
              href="/students?status=verified"
              className="rounded-md transition-colors duration-150 hover:text-white"
            >
              <span className="numeric font-semibold text-white">
                <CountUp value={verified} duration={800} delay={150} />
              </span>{" "}
              verified
            </Link>
            <span aria-hidden="true" className="mx-1.5 text-brand-500">·</span>
            <span className="rounded-md">
              <span className="numeric font-semibold text-white">
                <CountUp value={barangayCount} duration={800} delay={300} />
              </span>{" "}
              grade level{barangayCount === 1 ? "" : "s"}
            </span>
          </p>
        </div>
        <Link
          href="/students"
          className="shrink-0 self-start rounded-md bg-white px-4 py-2 text-sm font-medium text-brand-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-sm md:self-auto"
        >
          View Student Registry
        </Link>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Barangay distribution                                                     */
/* -------------------------------------------------------------------------- */

export function BarangayDistribution({ rows }: { rows: GradeLevelRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const visible = rows.slice(0, 8);
  const hidden = rows.length - visible.length;

  return (
    <Panel
      title="Students by Grade Level"
      description="Distribution of enrolled students across grade levels."
      action={rows.length > 0 ? <PanelLink href="/students">View registry</PanelLink> : undefined}
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-brand-400">No records yet.</p>
      ) : (
        <>
          {/* Interactive client island: staggered entrance, hover/focus tooltips,
              and drill-down to the registry filtered by grade level (plan §12). */}
          <ul className="space-y-2.5">
            {visible.map((row, i) => (
              <DistributionBar
                key={row.id}
                label={row.name}
                value={row.value}
                max={max}
                rank={i + 1}
                index={i}
                barClassName="bg-action-600"
                href={`/students?gradeLevel=${encodeURIComponent(row.id)}`}
              />
            ))}
          </ul>
          {hidden > 0 ? (
            <p className="mt-3 border-t border-brand-100 pt-2.5 text-xs text-[#64748B]">
              + {hidden} more grade level{hidden === 1 ? "" : "s"} in the{" "}
              <Link href="/students" className="font-medium text-action-700 hover:text-action-800">
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
  "Pending Verification": "bg-amber-500",
  "Needs Correction": "bg-red-500",
  Draft: "bg-brand-300",
};

const STATUS_PARAM: Record<string, string> = {
  Verified: "verified",
  "Pending Verification": "pending_validation",
  "Needs Correction": "needs_correction",
  Draft: "draft",
};

export function RecordStatusCard({ rows }: { rows: DistributionRow[] }) {
  return (
    <Panel
      title="Record Status"
      description="Workflow state of registered records."
      action={rows.length > 0 ? <PanelLink href="/students?status=pending_validation">Review</PanelLink> : undefined}
    >
      <ul className="divide-y divide-brand-100">
        {rows.map((row) => (
          <li key={row.label} className="first:pt-0 last:pb-0">
            <Link
              href={`/students?status=${STATUS_PARAM[row.label] ?? ""}`}
              className="group -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors duration-150 hover:bg-brand-50"
            >
              <span className="flex min-w-0 items-center gap-2 text-xs text-brand-600">
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full animate-pulse",
                    RECORD_TONES[row.label] ?? "bg-brand-300",
                  )}
                />
                <span className="truncate">{row.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-0.5">
                <span className="numeric text-sm font-semibold text-brand-900 transition-colors duration-150 group-hover:text-action-700">
                  {row.value}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 -translate-x-0.5 text-brand-400 opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100"
                />
              </span>
            </Link>
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
  Active: "bg-emerald-600",
  Completed: "bg-brand-600",
  Transferred: "bg-amber-500",
  Withdrawn: "bg-red-500",
};

export function EducationDistribution({ rows }: { rows: DistributionRow[] }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  const withValues = rows.filter((r) => r.value > 0);

  return (
    <Panel
      title="Enrollment Status Distribution"
      description="Current enrollment status of registered students."
      action={total > 0 ? <PanelLink href="/students">Open registry</PanelLink> : undefined}
    >
      {total === 0 ? (
        <p className="py-6 text-center text-sm text-brand-400">No enrollment records yet.</p>
      ) : (
        <>
          {/* Stacked distribution bar — segments fill left to right, staggered,
              when the panel scrolls into view. */}
          <AnimatedStackedBar
            ariaLabel={`Enrollment status distribution of ${total} students`}
            trackClassName="h-2.5"
            segments={withValues.map((row) => ({
              className: EDU_BAR[row.label] ?? "bg-brand-300",
              percent: (row.value / total) * 100,
              title: `${row.label}: ${row.value}`,
            }))}
          />
          <ul className="mt-3.5 divide-y divide-brand-100">
            {rows.map((row) => {
              const value = (
                <span className="shrink-0 text-xs text-[#64748B]">
                  <span className="numeric font-semibold text-brand-900">{row.value}</span>
                  <span className="numeric ml-1.5">
                    ({Math.round((row.value / total) * 100)}%)
                  </span>
                </span>
              );
              return (
                <li key={row.label}>
                  {row.label === "Active" && row.value > 0 ? (
                    <Link
                      href="/students"
                      aria-label={`Open ${row.label} students in the registry`}
                      className="group -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors duration-150 hover:bg-brand-50"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-xs text-brand-600">
                        <span
                          aria-hidden="true"
                          className={cn("h-2 w-2 shrink-0 rounded-sm", EDU_BAR[row.label] ?? "bg-brand-300")}
                        />
                        <span className="truncate">{row.label}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-0.5">
                        {value}
                        <ChevronRight
                          aria-hidden="true"
                          className="h-3.5 w-3.5 -translate-x-0.5 text-brand-400 opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100"
                        />
                      </span>
                    </Link>
                  ) : (
                    <div className="-mx-2 flex items-center justify-between gap-3 px-2 py-1.5">
                      <span className="flex min-w-0 items-center gap-2 text-xs text-brand-600">
                        <span
                          aria-hidden="true"
                          className={cn("h-2 w-2 shrink-0 rounded-sm", EDU_BAR[row.label] ?? "bg-brand-300")}
                        />
                        <span className="truncate">{row.label}</span>
                      </span>
                      {value}
                    </div>
                  )}
                </li>
              );
            })}
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
  counts: VerificationCounts;
  canReview: boolean;
}) {
  const rows = [
    { label: "Verified Records", value: counts.verified, tone: "bg-emerald-500", href: "/students?status=verified" },
    { label: "Pending Verification", value: counts.pending, tone: "bg-amber-500", href: canReview ? "/verification" : "/students?status=pending_validation" },
    { label: "Needs Correction", value: counts.needsCorrection, tone: "bg-red-500", href: "/students?status=needs_correction" },
    { label: "Duplicate Flags", value: counts.duplicateFlags, tone: "bg-brand-400", href: "/duplicates" },
  ];
  const href = canReview ? "/verification" : "/students?status=pending_validation";

  return (
    <Panel
      title="Verification Queue"
      description="Verification progress and review backlog."
      action={<PanelLink href={href}>Open queue</PanelLink>}
    >
      <ul className="divide-y divide-brand-100">
        {rows.map((row) => (
          <li key={row.label} className="first:pt-0 last:pb-0">
            <Link
              href={row.href}
              aria-label={`${row.label}: ${row.value}`}
              className="group -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors duration-150 hover:bg-brand-50"
            >
              <span className="flex min-w-0 items-center gap-2 text-xs text-brand-600">
                <span
                  aria-hidden="true"
                  className={cn("h-1.5 w-1.5 shrink-0 rounded-full animate-pulse", row.tone)}
                />
                <span className="truncate">{row.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-0.5">
                <span className="numeric text-sm font-semibold text-brand-900 transition-colors duration-150 group-hover:text-action-700">
                  {row.value}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 -translate-x-0.5 text-brand-400 opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100"
                />
              </span>
            </Link>
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
  green: "text-emerald-600",
  red: "text-red-600",
  amber: "text-amber-600",
  blue: "text-brand-600",
  gray: "text-[#94A3B8]",
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
                  className={cn("shrink-0", ACTIVITY_TONE_STYLES[tone])}
                >
                  <DashIcon name={activityIcon(item)} className="h-4 w-4" />
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

export function SectionCoverageTable({ rows }: { rows: SectionCoverageRow[] }) {
  return (
    <Panel
      title="Grade-Level Coverage"
      description="Enrolled students and grade recording per grade level."
      action={<PanelLink href="/performance">Open performance</PanelLink>}
      bodyClassName="px-0 py-0"
    >
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-brand-400">No records yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="border-b border-brand-100 text-[11px] uppercase tracking-wide text-brand-400">
                <th scope="col" className="px-4 py-2 font-semibold">Grade Level</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Enrolled</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">With Grades</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {rows.map((row, i) => {
                const coverage =
                  row.registered > 0
                    ? Math.round((row.withGrades / row.registered) * 100)
                    : 0;
                return (
                  <tr key={row.gradeLevel} className="transition-colors duration-150 hover:bg-brand-50/70">
                    <td className="max-w-[140px] truncate px-4 py-2 text-brand-700" title={row.gradeLevel}>
                      {row.gradeLevel}
                    </td>
                    <td className="numeric px-3 py-2 text-right font-medium text-brand-900">
                      {row.registered}
                    </td>
                    <td className="numeric px-3 py-2 text-right text-emerald-700">
                      {row.withGrades}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <AnimatedBar
                          widthPercent={coverage}
                          className="bg-emerald-600"
                          trackClassName="h-1.5 w-16"
                          delay={i * 80}
                        />
                        <span className="numeric w-9 text-right text-[#64748B]">{coverage}%</span>
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

export function BehaviorConcernsCard({
  counts,
  openTotal,
}: {
  counts: { label: string; value: number }[];
  openTotal: number;
}) {
  const max = Math.max(1, ...counts.map((c) => c.value));
  return (
    <Panel
      title="Open Behavior Concerns"
      description={`${openTotal} open concern record${openTotal === 1 ? "" : "s"} in your scope.`}
      action={<PanelLink href="/development/behavior">View records</PanelLink>}
    >
      {counts.length === 0 ? (
        <p className="py-6 text-center text-sm text-brand-400">No open behavior concerns.</p>
      ) : (
        <ul className="space-y-2.5">
          {counts.map((row, i) => (
            <DistributionBar
              key={row.label}
              label={row.label}
              value={row.value}
              max={max}
              rank={i + 1}
              index={i}
              barClassName="bg-amber-500"
            />
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
      label: "Open interventions",
      value: `${status.openInterventions}`,
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
        Records Management System — Sta. Magdalena National High School
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
                <p className={cn("truncate text-xs", n.isRead ? "text-[#64748B]" : "font-medium text-brand-800")}>
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
