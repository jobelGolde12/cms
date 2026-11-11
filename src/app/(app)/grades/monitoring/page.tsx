import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Filter, Info } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasUserPermission } from "@/lib/permissions";
import {
  gradeSubmissionMonitoring,
  listDeadlinePeriods,
  type SubmissionFilter,
} from "@/lib/grade-submissions";
import {
  GRADE_SUBMISSION_STATUSES,
  GRADE_SUBMISSION_STATUS_LABELS,
  type GradeSubmissionStatus,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";
import { buttonStyles } from "@/components/ui/button";
import {
  DeadlineConfig,
  type DeadlinePeriod,
} from "@/components/grades/deadline-config";

export const metadata = { title: "Grade Submission Monitoring · Records Management System" };

const STATUS_TONE: Record<GradeSubmissionStatus, "verified" | "pending" | "error" | "info" | "neutral"> = {
  submitted_on_time: "verified",
  submitted: "info",
  submitted_late: "pending",
  overdue: "error",
  missing: "error",
  not_yet_due: "neutral",
};

export default async function GradeSubmissionMonitoringPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasUserPermission(user.roles, "grades.monitor")) {
    redirect("/dashboard?denied=" + encodeURIComponent("grades.monitor"));
  }

  const sp = await searchParams;
  const param = (key: string): string | undefined => {
    const value = sp[key];
    return typeof value === "string" && value.trim() !== "" ? value : undefined;
  };

  const statusParam = param("status");
  const filter: SubmissionFilter = {
    schoolYearId: param("sy"),
    gradeLevelId: param("level"),
    sectionId: param("section"),
    subjectId: param("subject"),
    teacherId: param("teacher"),
    gradingPeriodId: param("period"),
    status:
      statusParam && (GRADE_SUBMISSION_STATUSES as readonly string[]).includes(statusParam)
        ? (statusParam as GradeSubmissionStatus)
        : "all",
  };

  const data = await gradeSubmissionMonitoring(filter);
  const canConfigure = hasUserPermission(user.roles, "academics.config");
  const deadlinePeriods: DeadlinePeriod[] = canConfigure
    ? (await listDeadlinePeriods(filter.schoolYearId)).map((p) => ({
        id: p.id,
        name: p.name,
        schoolYear: p.schoolYear,
        deadline: p.deadline,
        startDate: p.startDate,
        endDate: p.endDate,
      }))
    : [];

  const summaryCards = [
    { label: "Expected submissions", value: data.summary.total, tone: "text-brand-900" },
    { label: "Completion", value: `${data.summary.completionRate}%`, tone: "text-action-700" },
    { label: "On time", value: data.summary.onTime, tone: "text-emerald-700" },
    { label: "Late", value: data.summary.late, tone: "text-amber-700" },
    { label: "Overdue / Missing", value: data.summary.overdue + data.summary.missing, tone: "text-red-700" },
    { label: "Not yet due", value: data.summary.notYetDue, tone: "text-[#64748B]" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academic Monitoring"
        title="Grade Submission Monitoring"
        description="Tracks every expected grade submission against its grading-period deadline. Deadlines are evaluated server-side in Asia/Manila; submission timestamps come from the grade-submission ledger and cannot be set by the browser."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-brand-200 bg-white px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#64748B]">{card.label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Filter submissions"
          description="Narrow the monitoring view by school year, grade level, section, subject, teacher, grading period or status."
          icon={<Filter aria-hidden="true" className="h-4 w-4" />}
        />
        <form method="get" className="grid gap-3 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-700">
            School year
            <select name="sy" defaultValue={filter.schoolYearId ?? ""} className="h-9 rounded-md border border-brand-300 bg-white px-2 text-sm text-brand-900">
              <option value="">All school years</option>
              {data.options.schoolYears.map((sy) => (
                <option key={sy.id} value={sy.id}>{sy.year}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-700">
            Grade level
            <select name="level" defaultValue={filter.gradeLevelId ?? ""} className="h-9 rounded-md border border-brand-300 bg-white px-2 text-sm text-brand-900">
              <option value="">All grade levels</option>
              {data.options.gradeLevels.map((level) => (
                <option key={level.id} value={level.id}>{level.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-700">
            Section
            <select name="section" defaultValue={filter.sectionId ?? ""} className="h-9 rounded-md border border-brand-300 bg-white px-2 text-sm text-brand-900">
              <option value="">All sections</option>
              {data.options.sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.gradeLevelName} — {section.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-700">
            Subject
            <select name="subject" defaultValue={filter.subjectId ?? ""} className="h-9 rounded-md border border-brand-300 bg-white px-2 text-sm text-brand-900">
              <option value="">All subjects</option>
              {data.options.subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-700">
            Teacher
            <select name="teacher" defaultValue={filter.teacherId ?? ""} className="h-9 rounded-md border border-brand-300 bg-white px-2 text-sm text-brand-900">
              <option value="">All teachers</option>
              {data.options.teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-700">
            Grading period
            <select name="period" defaultValue={filter.gradingPeriodId ?? ""} className="h-9 rounded-md border border-brand-300 bg-white px-2 text-sm text-brand-900">
              <option value="">All periods</option>
              {data.options.gradingPeriods.map((period) => (
                <option key={period.id} value={period.id}>{period.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-700">
            Status
            <select name="status" defaultValue={statusParam ?? ""} className="h-9 rounded-md border border-brand-300 bg-white px-2 text-sm text-brand-900">
              <option value="">All statuses</option>
              {GRADE_SUBMISSION_STATUSES.map((status) => (
                <option key={status} value={status}>{GRADE_SUBMISSION_STATUS_LABELS[status]}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className={buttonStyles("secondary", "sm")}>Apply filters</button>
            <Link href="/grades/monitoring" className={buttonStyles("outline", "sm")}>Reset</Link>
          </div>
        </form>
      </Card>

      {canConfigure ? <DeadlineConfig periods={deadlinePeriods} /> : null}

      {data.periods.length > 0 ? (
        <Card>
          <CardHeader
            title="Status by grading period"
            description="Completion counts on-time, late and already-submitted sheets as complete."
            icon={<ClipboardList aria-hidden="true" className="h-4 w-4" />}
          />
          <TableWrap minWidth={640}>
            <thead>
              <tr>
                <Th>Grading period</Th>
                <Th>Deadline</Th>
                <Th align="right">Expected</Th>
                <Th align="right">On time</Th>
                <Th align="right">Late</Th>
                <Th align="right">Outstanding</Th>
                <Th align="right">Completion</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {data.periods.map((period) => (
                <tr key={period.gradingPeriodId}>
                  <Td className="font-medium text-brand-900">{period.name}</Td>
                  <Td className="text-xs text-[#64748B]">{period.deadline ?? "Not configured"}</Td>
                  <Td align="right">{period.total}</Td>
                  <Td align="right" className="text-emerald-700">{period.onTime}</Td>
                  <Td align="right" className="text-amber-700">{period.late}</Td>
                  <Td align="right" className="text-red-700">{period.outstanding}</Td>
                  <Td align="right" className="font-semibold">{period.completionRate}%</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Expected submissions"
          description={`${data.filtered.length} row${data.filtered.length === 1 ? "" : "s"} match the current filters.`}
          icon={<Info aria-hidden="true" className="h-4 w-4" />}
        />
        <TableWrap minWidth={980}>
          <thead>
            <tr>
              <Th>Teacher</Th>
              <Th>Subject</Th>
              <Th>Grade level / Section</Th>
              <Th>Grading period</Th>
              <Th>Deadline</Th>
              <Th>Submitted</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {data.filtered.length === 0 ? (
              <TableEmptyState
                colSpan={7}
                icon={<ClipboardList className="h-10 w-10" />}
                title="No expected submissions"
                description="Assign subject teachers to sections (Teacher Assignments) and configure grading periods to populate this monitor."
              />
            ) : (
              data.filtered.map((row) => (
                <tr key={row.key} className="transition-colors hover:bg-brand-50/70">
                  <Td className="font-medium text-brand-900">{row.teacherName}</Td>
                  <Td className="text-brand-700">{row.subjectName}</Td>
                  <Td className="text-brand-700">
                    {row.gradeLevelName} — {row.sectionName}
                  </Td>
                  <Td className="text-brand-700">{row.gradingPeriodName}</Td>
                  <Td className="text-xs text-[#64748B]">{row.deadline ?? "—"}</Td>
                  <Td className="text-xs text-[#64748B]">
                    {row.submittedAt ? formatDateTime(row.submittedAt) : "—"}
                    {row.submittedByName ? (
                      <span className="block text-[11px]">by {row.submittedByName}</span>
                    ) : null}
                  </Td>
                  <Td>
                    <Badge tone={STATUS_TONE[row.status]}>
                      {GRADE_SUBMISSION_STATUS_LABELS[row.status]}
                    </Badge>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}
