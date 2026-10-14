import { redirect } from "next/navigation";
import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { healthStats, listHealthRecords } from "@/lib/queries";
import { formatDate, fullName } from "@/lib/utils";
import { NUTRITIONAL_STATUS_LABELS, NUTRITIONAL_STATUSES, type NutritionalStatus } from "@/lib/constants";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";

export const metadata = { title: "Health & Nutrition" };

/**
 * Health & Nutrition dashboard — Nurse domain (health.view only: admin, nurse).
 * Statistics and records are fetched server-side; the permission check above
 * the data fetch means the page can never leak health data to other roles.
 */
export default async function HealthPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "health.view")) redirect("/dashboard?denied=health.view");

  const [stats, records] = await Promise.all([healthStats(), listHealthRecords(50)]);

  const statusCount: Record<NutritionalStatus, number> = {
    normal: 0,
    wasted: 0,
    severely_wasted: 0,
    overweight: 0,
    obese: 0,
  };
  for (const row of stats) {
    if (row.nutritionalStatus && row.nutritionalStatus in statusCount) {
      statusCount[row.nutritionalStatus as NutritionalStatus] = row.count;
    }
  }
  const assessed = records.length;
  const flagged =
    statusCount.wasted + statusCount.severely_wasted + statusCount.overweight + statusCount.obese;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Health Services"
        title="Health & Nutrition"
        description="Nutritional status measurements and school-health clinical records. Only System Administrators and Nurses can view this module."
      />

      {/* Status distribution cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-400">
            Assessed
          </p>
          <p className="numeric text-xl font-bold text-brand-900">{assessed}</p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-400">
            Needs attention
          </p>
          <p className="numeric text-xl font-bold text-action-700">{flagged}</p>
        </Card>
        {NUTRITIONAL_STATUSES.map((s) => (
          <Card key={s} className="px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-400">
              {NUTRITIONAL_STATUS_LABELS[s]}
            </p>
            <p className="numeric text-xl font-bold text-brand-900">{statusCount[s]}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Recent nutritional assessments"
          description={`${records.length} most recent measurement${records.length === 1 ? "" : "s"}.`}
          icon={<HeartPulse aria-hidden="true" className="h-4 w-4" />}
        />
        <TableWrap minWidth={820}>
          <thead>
            <tr>
              <Th>Student</Th>
              <Th>Date</Th>
              <Th>Weight</Th>
              <Th>Height</Th>
              <Th>BMI</Th>
              <Th>Status</Th>
              <Th>Recorded by</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {records.length === 0 ? (
              <TableEmptyState
                colSpan={7}
                icon={<HeartPulse className="h-10 w-10" />}
                title="No health measurements yet"
                description="Open a student and use the Health section to record weight, height, and nutritional status."
              />
            ) : (
              records.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-brand-50/70">
                  <Td className="font-medium text-brand-900">
                    <Link
                      href={`/students/${r.studentId}`}
                      className="transition-colors hover:text-action-700"
                    >
                      {fullName(r)}
                    </Link>
                    <span className="numeric ml-2 text-xs text-brand-500">{r.studentNumber}</span>
                  </Td>
                  <Td className="numeric text-xs text-brand-600">{formatDate(r.measurementDate)}</Td>
                  <Td className="numeric text-xs text-brand-700">{r.weightKg ?? "—"}</Td>
                  <Td className="numeric text-xs text-brand-700">{r.heightCm ?? "—"}</Td>
                  <Td className="numeric text-xs text-brand-700">{r.bmi ?? "—"}</Td>
                  <Td className="text-xs capitalize text-brand-700">
                    {r.nutritionalStatus
                      ? NUTRITIONAL_STATUS_LABELS[r.nutritionalStatus as NutritionalStatus] ??
                        r.nutritionalStatus
                      : "—"}
                  </Td>
                  <Td className="text-xs text-brand-500">
                    {r.recorderFirst ? `${r.recorderFirst} ${r.recorderLast}` : "—"}
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
