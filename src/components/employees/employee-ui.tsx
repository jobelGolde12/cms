import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import {
  APPOINTMENT_STATUS_LABELS,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  type AppointmentStatus,
  type EmployeeStatus,
  type EmploymentType,
} from "@/lib/constants";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TableWrap, Th, Td, TableEmptyState } from "@/components/ui/table";
import type { EmployeeListRow } from "@/lib/employees";

/* ------------------------------- KPI grid -------------------------------- */

export function EmployeeKpiGrid({
  stats,
}: {
  stats: { total: number; active: number; inactive: number; archived: number };
}) {
  const kpis = [
    { label: "Total Employees", value: stats.total, tone: "text-brand-900" },
    { label: "Active", value: stats.active, tone: "text-emerald-700" },
    { label: "Inactive", value: stats.inactive, tone: "text-amber-700" },
    { label: "Archived", value: stats.archived, tone: "text-brand-500" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {kpis.map((k) => (
        <Card key={k.label}>
          <CardBody className="py-3.5">
            <p className="text-xs font-medium text-brand-500">{k.label}</p>
            <p className={`mt-1 text-2xl font-bold tracking-tight ${k.tone}`}>
              {k.value.toLocaleString("en-PH")}
            </p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------- Filter bar ------------------------------ */

export function EmployeeFilters({
  values,
}: {
  values: { q: string; status: string; employmentType: string; appointmentStatus: string; sort: string };
}) {
  const selectCls =
    "h-9 rounded-md border border-brand-200 bg-white px-2 text-xs text-brand-700";
  return (
    <Card>
      <CardBody className="py-3">
        <form action="/employees" method="GET" className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-400"
            />
            <label htmlFor="employee-search" className="sr-only">
              Search employees
            </label>
            <input
              id="employee-search"
              type="search"
              name="q"
              defaultValue={values.q}
              placeholder="Search name, number, position…"
              autoComplete="off"
              className="h-9 w-full rounded-md border border-brand-200 bg-[#f8fafc] pl-8 pr-3 text-xs text-brand-800 placeholder:text-brand-400 focus:border-action-500 focus:bg-white focus:outline-none"
            />
          </div>

          <label htmlFor="emp-status" className="sr-only">
            Status
          </label>
          <select id="emp-status" name="status" defaultValue={values.status} className={selectCls}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
            <option value="">All statuses</option>
          </select>

          <label htmlFor="emp-type" className="sr-only">
            Employment type
          </label>
          <select id="emp-type" name="employmentType" defaultValue={values.employmentType} className={selectCls}>
            <option value="">All types</option>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EMPLOYMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>

          <label htmlFor="emp-appointment" className="sr-only">
            Appointment status
          </label>
          <select
            id="emp-appointment"
            name="appointmentStatus"
            defaultValue={values.appointmentStatus}
            className={selectCls}
          >
            <option value="">All appointments</option>
            {Object.keys(APPOINTMENT_STATUS_LABELS).map((a) => (
              <option key={a} value={a}>
                {APPOINTMENT_STATUS_LABELS[a as AppointmentStatus]}
              </option>
            ))}
          </select>

          <select name="sort" defaultValue={values.sort} aria-label="Sort order" className={selectCls}>
            <option value="recent">Newest first</option>
            <option value="name">Name A–Z</option>
            <option value="oldest">Oldest first</option>
          </select>

          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-md bg-brand-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800"
          >
            Apply
          </button>
          <Link
            href="/employees"
            className="inline-flex h-9 items-center rounded-md border border-brand-300 bg-white px-3 text-[13px] font-medium text-brand-700 hover:bg-brand-100"
          >
            Reset
          </Link>
        </form>
      </CardBody>
    </Card>
  );
}

/* ------------------------------ Table & badge ---------------------------- */

export function EmployeeStatusBadge({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : status === "inactive"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-brand-100 text-brand-700 border-brand-200";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>
      {EMPLOYEE_STATUS_LABELS[status as EmployeeStatus] ?? status}
    </span>
  );
}

export function EmployeeTable({
  rows,
  hasFilters,
}: {
  rows: EmployeeListRow[];
  hasFilters: boolean;
}) {
  return (
    <TableWrap minWidth={860}>
      <thead>
        <tr>
          <Th>Employee No.</Th>
          <Th>Name</Th>
          <Th>Position</Th>
          <Th>Employment Type</Th>
          <Th>Appointment</Th>
          <Th>Status</Th>
          <Th align="right">Actions</Th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <TableEmptyState
            colSpan={7}
            icon={<Users aria-hidden="true" className="h-10 w-10" />}
            title={hasFilters ? "No employees match your filters" : "No employee records yet"}
            description={
              hasFilters
                ? "Adjust the search or filters, or reset them."
                : "Employee records added by the Admin Officer will appear here."
            }
          />
        ) : (
          rows.map((r) => (
            <tr key={r.id} className="transition-colors hover:bg-brand-50">
              <Td className="numeric font-medium">{r.employeeNumber}</Td>
              <Td>
                <Link
                  href={`/employees/${r.id}`}
                  className="font-medium text-brand-900 hover:text-action-700 hover:underline"
                >
                  {[r.lastName, r.firstName, r.suffix].filter(Boolean).join(", ")}
                  {r.middleName ? ` ${r.middleName}` : ""}
                </Link>
              </Td>
              <Td>{r.position ?? "—"}</Td>
              <Td>
                {r.employmentType
                  ? (EMPLOYMENT_TYPE_LABELS[r.employmentType as EmploymentType] ?? r.employmentType)
                  : "—"}
              </Td>
              <Td>
                {r.appointmentStatus
                  ? (APPOINTMENT_STATUS_LABELS[r.appointmentStatus as AppointmentStatus] ?? r.appointmentStatus)
                  : "—"}
              </Td>
              <Td>
                <EmployeeStatusBadge status={r.status} />
              </Td>
              <Td align="right">
                <div className="flex justify-end gap-1.5">
                  <Link
                    href={`/employees/${r.id}/201`}
                    className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-100 hover:text-brand-900"
                  >
                    201
                  </Link>
                  <Link
                    href={`/employees/${r.id}/service-credits`}
                    className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-100 hover:text-brand-900"
                  >
                    Credits
                  </Link>
                </div>
              </Td>
            </tr>
          ))
        )}
      </tbody>
    </TableWrap>
  );
}

/* ------------------------------- Pagination ------------------------------ */

export function EmployeePagination({
  page,
  pageSize,
  total,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || typeof value !== "string" || !value) continue;
    params.set(key, value);
  }
  const href = (p: number) => `/employees?${new URLSearchParams({ ...Object.fromEntries(params), page: String(p) })}`;

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-brand-100 px-4 py-3 sm:flex-row">
      <p className="text-xs text-brand-500">
        Showing <span className="numeric font-medium text-brand-700">{from}</span>–
        <span className="numeric font-medium text-brand-700">{to}</span> of{" "}
        <span className="numeric font-medium text-brand-700">{total.toLocaleString("en-PH")}</span> employees
      </p>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            aria-label="Previous page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-brand-200 bg-white text-brand-600 hover:bg-brand-50"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : null}
        <span className="px-2 text-xs font-medium text-brand-700">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={href(page + 1)}
            aria-label="Next page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-brand-200 bg-white text-brand-600 hover:bg-brand-50"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : null}
      </nav>
    </div>
  );
}

/* ------------------------- Service credits overview ---------------------- */

export function CreditBadges({ earned, consumed, balance }: { earned: number; consumed: number; balance: number }) {
  const cls = balance < 0 ? "bg-red-50 text-red-800 border-red-200" : "bg-sky-50 text-sky-800 border-sky-200";
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="numeric rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">
        Earned {earned.toFixed(2)}
      </span>
      <span className="numeric rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-800">
        Consumed {consumed.toFixed(2)}
      </span>
      <span className={`numeric rounded-full border px-2 py-0.5 font-semibold ${cls}`}>
        Balance {balance.toFixed(2)}
      </span>
    </div>
  );
}

/* ------------------------------ About card -------------------------------- */

export function EmployeeModuleInfo() {
  return (
    <Card>
      <CardHeader title="About employee records" icon={<Users aria-hidden="true" className="h-4 w-4" />} />
      <CardBody>
        <p className="text-xs leading-relaxed text-brand-500">
          Employee records cover personal information, employment details, government/personnel
          identifiers, 201 files and service credits. This module is strictly limited to
          authorized employee-records personnel; student records live in separate, access-controlled
          modules.
        </p>
      </CardBody>
    </Card>
  );
}
