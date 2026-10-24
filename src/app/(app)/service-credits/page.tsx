import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { serviceCreditOverview } from "@/lib/employees";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TableWrap, Th, Td, TableEmptyState } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import {
  CreditBadges,
  EmployeePagination,
  EmployeeStatusBadge,
} from "@/components/employees/employee-ui";

export const metadata = { title: "Service Credits" };

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "employee_number", label: "Employee No." },
  { value: "earned", label: "Total earned" },
  { value: "consumed", label: "Total consumed" },
  { value: "balance", label: "Available balance" },
  { value: "position", label: "Position" },
  { value: "status", label: "Status" },
];

export default async function ServiceCreditsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "service_credits.view")) redirect("/dashboard");

  const sp = await searchParams;
  const str = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : "");
  const q = str("q").trim();
  // Unrecognized values are dropped server-side by the query layer.
  const status = ["active", "inactive", "archived"].includes(str("status")) ? str("status") : "";
  const balanceStatus = ["has_available", "zero", "negative"].includes(str("balance"))
    ? str("balance")
    : "";
  const txStatus = ["has_transactions", "no_transactions"].includes(str("tx")) ? str("tx") : "";
  const sort = SORT_OPTIONS.some((o) => o.value === str("sort")) ? str("sort") : "";
  const dir = str("dir") === "desc" ? "desc" : str("dir") === "asc" ? "asc" : "";
  const pageSize = parseInt(str("pageSize"), 10) || undefined;
  const page = parseInt(str("page"), 10) || 1;

  const result = await serviceCreditOverview({
    q,
    status,
    balanceStatus,
    txStatus,
    sort,
    dir,
    page: Number.isFinite(page) ? page : 1,
    pageSize: pageSize && [10, 25, 50, 100].includes(pageSize) ? pageSize : undefined,
  });

  const hasFilters = Boolean(q || status || balanceStatus || txStatus || sort || dir);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  const selectCls = "h-8 rounded-md border border-brand-200 bg-white px-2 text-xs text-[#263449]";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Service Credits"
        title="Service Credits Overview"
        description="Ledger-derived earned, consumed and available service credits per employee."
      />

      {/* Summary totals cover the ENTIRE filtered dataset so they stay stable
          while the user pages through the table. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Total Earned", value: result.totals.earned, tone: "text-emerald-700" },
          { label: "Total Consumed", value: result.totals.consumed, tone: "text-amber-700" },
          { label: "Total Available", value: result.totals.available, tone: "text-brand-900" },
        ].map((c) => (
          <Card key={c.label}>
            <CardBody className="py-3.5">
              <p className="text-xs font-medium text-[#64748B]">{c.label}</p>
              <p className={`numeric mt-1 text-2xl font-bold tracking-tight ${c.tone}`}>
                {c.value.toFixed(2)}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Employees"
          description={`${result.total} employee${result.total === 1 ? "" : "s"}${hasFilters ? " matching the current filters" : ""}`}
          icon={<Wallet aria-hidden="true" className="h-4 w-4" />}
          actions={
            <form action="/service-credits" method="GET" className="flex flex-wrap items-center gap-2">
              <label htmlFor="credits-search" className="sr-only">
                Search employees
              </label>
              <input
                id="credits-search"
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search name, number, position, department…"
                autoComplete="off"
                className="h-8 w-56 rounded-md border border-brand-200 bg-[#f8fafc] px-3 text-xs text-brand-800 placeholder:text-brand-400 focus:border-action-500 focus:bg-white focus:outline-none"
              />
              <label htmlFor="sc-status" className="sr-only">Employee status</label>
              <select id="sc-status" name="status" defaultValue={status} className={selectCls}>
                {[
                  { value: "", label: "All statuses" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "archived", label: "Archived" },
                ].map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <label htmlFor="sc-balance" className="sr-only">Balance status</label>
              <select id="sc-balance" name="balance" defaultValue={balanceStatus} className={selectCls}>
                {[
                  { value: "", label: "All balances" },
                  { value: "has_available", label: "Has available credits" },
                  { value: "zero", label: "Zero balance" },
                  { value: "negative", label: "Negative balance" },
                ].map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <label htmlFor="sc-tx" className="sr-only">Transaction history</label>
              <select id="sc-tx" name="tx" defaultValue={txStatus} className={selectCls}>
                {[
                  { value: "", label: "All transaction history" },
                  { value: "has_transactions", label: "Has transactions" },
                  { value: "no_transactions", label: "No transactions" },
                ].map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <label htmlFor="sc-sort" className="sr-only">Sort by</label>
              <select id="sc-sort" name="sort" defaultValue={sort} className={selectCls}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <label htmlFor="sc-dir" className="sr-only">Order</label>
              <select id="sc-dir" name="dir" defaultValue={dir} className={selectCls}>
                {[
                  { value: "asc", label: "Ascending" },
                  { value: "desc", label: "Descending" },
                ].map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <label htmlFor="sc-page-size" className="sr-only">Rows per page</label>
              <select id="sc-page-size" name="pageSize" defaultValue={String(result.pageSize)} className={selectCls}>
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
              <button
                type="submit"
                className="inline-flex h-8 items-center rounded-md bg-brand-900 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800"
              >
                Apply
              </button>
              {hasFilters ? (
                <Link
                  href="/service-credits"
                  className="text-xs font-medium text-action-700 hover:text-action-800"
                >
                  Clear
                </Link>
              ) : null}
            </form>
          }
        />
        <TableWrap minWidth={860}>
          <thead>
            <tr>
              <Th>Employee No.</Th>
              <Th>Name</Th>
              <Th>Position</Th>
              <Th>Status</Th>
              <Th>Credits</Th>
              <Th align="right">Ledger</Th>
            </tr>
          </thead>
          <tbody>
            {result.rows.length === 0 ? (
              <TableEmptyState
                colSpan={6}
                icon={<Wallet aria-hidden="true" className="h-10 w-10" />}
                title={
                  hasFilters
                    ? "No employees match the current filters"
                    : "No employees yet"
                }
                description={
                  hasFilters
                    ? "Adjust the search or filters, or clear them to see all employees."
                    : "Employee records with service-credit ledgers will appear here."
                }
              />
            ) : (
              result.rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-[#F4F7FC]">
                  <Td className="numeric font-medium">{r.employeeNumber}</Td>
                  <Td>
                    <span className="font-medium text-brand-900">
                      {[r.lastName, r.firstName, r.suffix].filter(Boolean).join(", ")}
                      {r.middleName ? ` ${r.middleName}` : ""}
                    </span>
                  </Td>
                  <Td>{r.position ?? "—"}</Td>
                  <Td>
                    <EmployeeStatusBadge status={r.status} />
                  </Td>
                  <Td>
                    <CreditBadges earned={r.earned} consumed={r.consumed} balance={r.balance} />
                  </Td>
                  <Td align="right">
                    <Link
                      href={`/employees/${r.id}/service-credits`}
                      className="rounded-md px-2 py-1 text-xs font-medium text-[#263449] hover:bg-brand-100 hover:text-[#14295F]"
                    >
                      Open ledger
                    </Link>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
        {result.total > result.pageSize ? (
          <EmployeePagination
            page={Math.min(result.page, totalPages)}
            pageSize={result.pageSize}
            total={result.total}
            searchParams={sp}
            basePath="/service-credits"
          />
        ) : null}
      </Card>
    </div>
  );
}
