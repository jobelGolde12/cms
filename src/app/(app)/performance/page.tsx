import { redirect } from "next/navigation";
import { TrendingUp, ClipboardList, CalendarDays, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { performanceOverview } from "@/lib/queries";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";

export const metadata = { title: "Academic Performance" };

/**
 * Academic performance overview. Surfaces the school-level aggregates already
 * computed by `performanceOverview()` (subject / grade-level / grading-period
 * averages, attendance rates and below-75 counts) in the standard Panel/Card
 * style used across the app.
 */
export default async function PerformancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "grades.view")) redirect("/dashboard");

  const data = await performanceOverview();

  const hasGrades = data.subjectAverages.length > 0;
  const overallCount = data.subjectAverages.reduce((s, r) => s + r.count, 0);
  const weightedSum = data.subjectAverages.reduce((s, r) => s + r.average * r.count, 0);
  const overallAverage = overallCount > 0 ? Math.round((weightedSum / overallCount) * 10) / 10 : null;

  const chips = [
    {
      label: "School Year",
      value: data.schoolYear ?? "—",
      icon: CalendarDays,
    },
    {
      label: "Overall Average",
      value: overallAverage !== null ? String(overallAverage) : "—",
      icon: TrendingUp,
    },
    {
      label: "Grades Recorded",
      value: String(overallCount),
      icon: ClipboardList,
    },
    {
      label: "Grade Levels",
      value: String(data.gradeAverages.length),
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academic Analytics"
        title="Academic Performance"
        description="School-wide grade averages, attendance rates, and students below the passing threshold for the current school year."
        actions={
          <>
            {chips.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-600"
              >
                <c.icon aria-hidden="true" className="h-3.5 w-3.5 text-brand-400" />
                {c.label}: <span className="numeric font-semibold text-brand-900">{c.value}</span>
              </span>
            ))}
          </>
        }
      />

      {/* ------------------------- Subject averages ------------------------- */}
      <Card>
        <CardHeader
          title="Subject Averages"
          description={hasGrades ? "Average grade per subject across the selected school year." : undefined}
          icon={<TrendingUp aria-hidden="true" className="h-4 w-4" />}
        />
        <TableWrap minWidth={720}>
          <thead>
            <tr>
              <Th>Subject</Th>
              <Th>Code</Th>
              <Th align="right">Average</Th>
              <Th align="right">Below 75</Th>
              <Th align="right">Grades</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {hasGrades ? (
              data.subjectAverages.map((r) => {
                const failing = data.failingCounts.find((f) => f.subject === r.subject);
                return (
                  <tr key={r.code} className="transition-colors hover:bg-brand-50/70">
                    <Td className="font-medium text-brand-900">{r.subject}</Td>
                    <Td className="text-xs text-brand-600">{r.code}</Td>
                    <Td className="numeric text-right text-brand-900">{r.average || "—"}</Td>
                    <Td className="numeric text-right">
                      {failing && failing.below75 > 0 ? (
                        <span className="font-medium text-status-error">
                          {failing.below75}
                          <span className="text-brand-400"> / {failing.total}</span>
                        </span>
                      ) : (
                        <span className="text-brand-500">0{failing ? ` / ${failing.total}` : ""}</span>
                      )}
                    </Td>
                    <Td className="numeric text-right text-brand-500">{r.count}</Td>
                  </tr>
                );
              })
            ) : (
              <TableEmptyState
                colSpan={5}
                icon={<TrendingUp className="h-10 w-10" />}
                title="No grades recorded yet"
                description="Subject averages appear once grades are entered for enrolled students."
              />
            )}
          </tbody>
        </TableWrap>
      </Card>

      {/* --------------------- Grade level + period averages --------------------- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Average by Grade Level"
            description="Mean grade across all recorded grades in each grade level."
            icon={<Users aria-hidden="true" className="h-4 w-4" />}
          />
          <CardBody>
            {data.gradeAverages.length === 0 ? (
              <EmptyState
                icon={<Users className="h-10 w-10" />}
                title="No grade-level data yet"
                description="Averages appear as soon as grades are recorded."
              />
            ) : (
              <ul className="space-y-2.5">
                {data.gradeAverages.map((row) => {
                  const width = Math.min(100, Math.max(0, ((row.average - 60) / 40) * 100));
                  return (
                    <li key={row.gradeLevel} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 truncate text-xs text-brand-600" title={row.gradeLevel}>
                        {row.gradeLevel}
                      </span>
                      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-brand-100">
                        <div
                          className={`h-full rounded-full ${row.average < 75 ? "bg-amber-500" : "bg-emerald-600"}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="numeric w-10 shrink-0 text-right text-xs font-semibold text-brand-900">
                        {row.average || "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Average by Grading Period"
            description="Mean grade recorded per quarter."
            icon={<ClipboardList aria-hidden="true" className="h-4 w-4" />}
          />
          <CardBody>
            {data.periodAverages.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-10 w-10" />}
                title="No quarter data yet"
                description="Quarterly averages appear as soon as grades are recorded."
              />
            ) : (
              <ul className="space-y-2.5">
                {data.periodAverages.map((row) => {
                  const width = Math.min(100, Math.max(0, ((row.average - 60) / 40) * 100));
                  return (
                    <li key={row.period} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 truncate text-xs text-brand-600">{row.period}</span>
                      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-brand-100">
                        <div
                          className={`h-full rounded-full ${row.average < 75 ? "bg-amber-500" : "bg-emerald-600"}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="numeric w-10 shrink-0 text-right text-xs font-semibold text-brand-900">
                        {row.average || "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ------------------------- Attendance rates ------------------------- */}
      <Card>
        <CardHeader
          title="Attendance Rate by Grade Level"
          description="Present and late entries as a share of all attendance records for the school year."
          icon={<CalendarDays aria-hidden="true" className="h-4 w-4" />}
        />
        <TableWrap minWidth={520}>
          <thead>
            <tr>
              <Th>Grade Level</Th>
              <Th align="right">Present / Late</Th>
              <Th align="right">All records</Th>
              <Th align="right">Rate</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {data.attendanceByGrade.length === 0 ? (
              <TableEmptyState
                colSpan={4}
                icon={<CalendarDays className="h-10 w-10" />}
                title="No attendance recorded yet"
                description="Attendance rates appear once attendance entries exist for enrolled students."
              />
            ) : (
              data.attendanceByGrade.map((r) => (
                <tr key={r.label} className="transition-colors hover:bg-brand-50/70">
                  <Td className="font-medium text-brand-900">{r.label}</Td>
                  <Td className="numeric text-right text-brand-700">{r.present}</Td>
                  <Td className="numeric text-right text-brand-500">{r.total}</Td>
                  <Td className="numeric text-right">
                    <span className={r.rate >= 90 ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                      {r.rate}%
                    </span>
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
