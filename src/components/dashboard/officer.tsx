import Link from "next/link";
import {
  Activity,
  FileText,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { type OfficerDashboardData } from "@/lib/employees";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TableWrap, Th, Td, TableEmptyState } from "@/components/ui/table";
import { hasPermission } from "@/lib/permissions";
import type { SessionUser } from "@/lib/auth";

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Admin Officer dashboard — exclusively employee-records metrics. No student
 * data is queried or rendered anywhere on this page surface.
 */
export function OfficerDashboard({
  data,
  user,
}: {
  data: OfficerDashboardData;
  user: SessionUser;
}) {
  const canUpdateEmployees = hasPermission(user.role, "employees.update");
  const today = new Date().toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const kpis = [
    { label: "Total Employees", value: data.totalEmployees, icon: Users, tone: "text-brand-900" },
    { label: "Active", value: data.activeEmployees, icon: Users, tone: "text-emerald-700" },
    { label: "Inactive", value: data.inactiveEmployees, icon: Users, tone: "text-amber-700" },
    { label: "Incomplete Profiles", value: data.incompleteProfiles, icon: TriangleAlert, tone: "text-red-700" },
  ];

  const creditCards = [
    { label: "Total Earned", value: data.creditsEarned, icon: TrendingUp, tone: "text-emerald-700" },
    { label: "Total Consumed", value: data.creditsConsumed, icon: TrendingDown, tone: "text-amber-700" },
    { label: "Available Balance", value: data.creditsAvailable, icon: Wallet, tone: "text-brand-900" },
  ];

  return (
    <div className="space-y-5">
      {/* ------------------------- Page header ------------------------- */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-action-700">
            Employee Records Overview
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900 sm:text-[28px]">
            Employees, 201 Files &amp; Service Credits
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-brand-500">
            Personnel records managed by the Admin Officer at Sta. Magdalena
            National High School.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-600">
            {today}
          </span>
        </div>
      </div>

      {/* ---------------------------- KPI grid ---------------------------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardBody className="py-3.5">
              <p className="text-xs font-medium text-brand-500">{k.label}</p>
              <p className={`numeric mt-1 text-2xl font-bold tracking-tight ${k.tone}`}>
                {k.value.toLocaleString("en-PH")}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* ----------------------- Service credit totals ----------------------- */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-brand-900">Service Credits (all employees)</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {creditCards.map((c) => (
            <Card key={c.label}>
              <CardBody className="flex items-center gap-3 py-3.5">
                <span aria-hidden="true" className={`rounded-lg bg-brand-100 p-2 ${c.tone}`}>
                  <c.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-medium text-brand-500">{c.label}</p>
                  <p className={`numeric text-xl font-bold tracking-tight ${c.tone}`}>
                    {c.value.toFixed(2)}
                  </p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      {/* --------------------- Main two-column layout --------------------- */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader
              title="Recent Employee Records"
              description="Latest profiles added"
              icon={<Users aria-hidden="true" className="h-4 w-4" />}
              actions={
                <Link href="/employees" className="text-xs font-medium text-action-700 hover:text-action-800">
                  View all
                </Link>
              }
            />
            <TableWrap minWidth={560}>
              <thead>
                <tr>
                  <Th>Employee No.</Th>
                  <Th>Name</Th>
                  <Th>Position</Th>
                  <Th>Created</Th>
                </tr>
              </thead>
              <tbody>
                {data.recentEmployees.length === 0 ? (
                  <TableEmptyState
                    colSpan={4}
                    icon={<Users aria-hidden="true" className="h-10 w-10" />}
                    title="No employees yet"
                    description="Added employee records will appear here."
                  />
                ) : (
                  data.recentEmployees.map((e) => (
                    <tr key={e.id} className="transition-colors hover:bg-brand-50">
                      <Td className="numeric font-medium">
                        <Link href={`/employees/${e.id}`} className="hover:text-action-700 hover:underline">
                          {e.employeeNumber}
                        </Link>
                      </Td>
                      <Td>{e.fullName}</Td>
                      <Td>{e.position ?? "—"}</Td>
                      <Td className="numeric whitespace-nowrap">{fmtDate(e.createdAt)}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </TableWrap>
          </Card>

          <Card>
            <CardHeader
              title="Recent Service Credit Transactions"
              icon={<Wallet aria-hidden="true" className="h-4 w-4" />}
              actions={
                <Link href="/service-credits" className="text-xs font-medium text-action-700 hover:text-action-800">
                  Overview
                </Link>
              }
            />
            <TableWrap minWidth={620}>
              <thead>
                <tr>
                  <Th>Employee</Th>
                  <Th>Type</Th>
                  <Th align="right">Credits</Th>
                  <Th>Date</Th>
                  <Th>Reason</Th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.length === 0 ? (
                  <TableEmptyState
                    colSpan={5}
                    icon={<Wallet aria-hidden="true" className="h-10 w-10" />}
                    title="No transactions yet"
                    description="Earned and consumed credit entries will appear here."
                  />
                ) : (
                  data.recentTransactions.map((t) => (
                    <tr key={t.id} className="transition-colors hover:bg-brand-50">
                      <Td>
                        <span className="font-medium text-brand-900">{t.employeeName}</span>
                        <span className="numeric ml-1.5 text-xs text-brand-500">{t.employeeNumber}</span>
                      </Td>
                      <Td>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                            t.type === "earned"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-amber-200 bg-amber-50 text-amber-800"
                          }`}
                        >
                          {t.type === "earned" ? "Earned" : "Consumed"}
                        </span>
                      </Td>
                      <Td align="right" className="numeric font-semibold">
                        {t.type === "earned" ? "+" : "−"}
                        {t.credits.toFixed(2)}
                      </Td>
                      <Td className="numeric whitespace-nowrap">{t.transactionDate}</Td>
                      <Td className="max-w-[220px] truncate">{t.reason}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </TableWrap>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="By Employment Type" icon={<FileText aria-hidden="true" className="h-4 w-4" />} />
            <CardBody>
              {data.byEmploymentType.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-brand-500">No data yet.</p>
              ) : (
                <ul className="divide-y divide-brand-100">
                  {data.byEmploymentType.map((r) => (
                    <li key={r.label} className="flex items-center justify-between py-2 text-[13px]">
                      <span className="text-brand-700">{r.label}</span>
                      <span className="numeric font-semibold text-brand-900">{r.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="By Appointment Status" icon={<Activity aria-hidden="true" className="h-4 w-4" />} />
            <CardBody>
              {data.byAppointmentStatus.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-brand-500">No data yet.</p>
              ) : (
                <ul className="divide-y divide-brand-100">
                  {data.byAppointmentStatus.map((r) => (
                    <li key={r.label} className="flex items-center justify-between py-2 text-[13px]">
                      <span className="text-brand-700">{r.label}</span>
                      <span className="numeric font-semibold text-brand-900">{r.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {data.incompleteProfiles > 0 && canUpdateEmployees ? (
            <Card className="border-amber-200 bg-amber-50/60">
              <CardBody>
                <div className="flex items-start gap-2.5">
                  <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <div>
                    <p className="text-[13px] font-semibold text-brand-900">Complete employee profiles</p>
                    <p className="mt-1 text-xs text-brand-600">
                      {data.incompleteProfiles} active employee{data.incompleteProfiles === 1 ? "" : "s"} are missing
                      position, appointment, employment type, or hire date.
                    </p>
                    <Link href="/employees" className="mt-2 inline-block text-xs font-medium text-action-700 hover:text-action-800">
                      Review records →
                    </Link>
                  </div>
                </div>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
