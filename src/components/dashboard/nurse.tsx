import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";
import { buttonStyles } from "@/components/ui/button";
import { NUTRITIONAL_STATUS_LABELS, type NutritionalStatus } from "@/lib/constants";
import { formatDate, fullName } from "@/lib/utils";
import type { DashboardResolution } from "@/lib/dashboard";

type HealthStat = { nutritionalStatus: string | null; count: number };

type HealthRow = {
  id: string;
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  measurementDate: string;
  bmi: number | null;
  nutritionalStatus: string | null;
};

/** Attendance-to-nutrition thresholds are already computed by the action layer. */
const ATTENTION_STATUSES: NutritionalStatus[] = [
  "wasted",
  "severely_wasted",
  "overweight",
  "obese",
];

/**
 * Nurse dashboard — health & nutrition only.
 *
 * Rendered only after the page has resolved the nurse dashboard view; the
 * health data comes from the same role-gated queries as /health, so no other
 * role can reach this surface (the proxy also requires `health.view`).
 */
export function NurseDashboard({
  resolution,
  stats,
  records,
}: {
  resolution: DashboardResolution;
  stats: HealthStat[];
  records: HealthRow[];
}) {
  const counts = new Map<string, number>();
  for (const row of stats) {
    if (row.nutritionalStatus) counts.set(row.nutritionalStatus, row.count);
  }
  const assessed = stats.reduce((sum, row) => sum + row.count, 0);
  const needsAttention = ATTENTION_STATUSES.reduce(
    (sum, status) => sum + (counts.get(status) ?? 0),
    0,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-brand-600">{resolution.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900 sm:text-[28px]">
            {resolution.title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#64748B]">
            {resolution.description}
          </p>
        </div>
        <Link href="/health" className={buttonStyles("primary", "sm")}>
          Open Health &amp; Nutrition
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-400">
            Assessments
          </p>
          <p className="numeric mt-1 text-xl font-bold text-brand-900">{assessed}</p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-400">
            Needs attention
          </p>
          <p className="numeric mt-1 text-xl font-bold text-action-700">
            {needsAttention}
          </p>
        </Card>
        {ATTENTION_STATUSES.map((status) => (
          <Card key={status} className="px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-400">
              {NUTRITIONAL_STATUS_LABELS[status]}
            </p>
            <p className="numeric mt-1 text-xl font-bold text-brand-900">
              {counts.get(status) ?? 0}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Recent measurements"
          description="Latest nutritional assessments recorded for students."
          icon={<HeartPulse aria-hidden="true" className="h-4 w-4" />}
          actions={
            <Link
              href="/health"
              className="text-xs font-semibold text-action-700 hover:text-action-800"
            >
              View all
            </Link>
          }
        />
        <CardBody className="pt-0">
          <TableWrap minWidth={720}>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Date</Th>
                <Th>BMI</Th>
                <Th>Nutritional status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {records.length === 0 ? (
                <TableEmptyState
                  colSpan={4}
                  icon={<HeartPulse className="h-10 w-10" />}
                  title="No health measurements yet"
                  description="Record weight and height from a student profile to start tracking nutrition."
                />
              ) : (
                records.map((row) => (
                  <tr key={row.id}>
                    <Td>
                      <Link
                        href={`/students/${row.studentId}`}
                        className="font-medium text-brand-900 hover:text-action-700"
                      >
                        {fullName({ firstName: row.firstName, lastName: row.lastName })}
                      </Link>
                      <div className="text-[11px] text-[#64748B]">
                        {row.studentNumber}
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-[#64748B]">
                      {formatDate(row.measurementDate)}
                    </Td>
                    <Td className="numeric text-sm text-brand-800">
                      {row.bmi ?? "—"}
                    </Td>
                    <Td className="text-sm text-brand-800">
                      {row.nutritionalStatus
                        ? (NUTRITIONAL_STATUS_LABELS[
                            row.nutritionalStatus as NutritionalStatus
                          ] ?? row.nutritionalStatus)
                        : "—"}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </TableWrap>
        </CardBody>
      </Card>
    </div>
  );
}
