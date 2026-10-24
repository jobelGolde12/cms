import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Archive, ChevronLeft, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  getEmployeeById,
  listServiceCreditTransactions,
  serviceCreditSummary,
} from "@/lib/employees";
import { AddServiceCreditModal } from "@/components/employees/service-credit-modal";
import { ServiceCreditEditButton } from "@/components/employees/service-credit-edit-modal";
import { EmployeePagination } from "@/components/employees/employee-ui";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TableWrap, Th, Td, TableEmptyState } from "@/components/ui/table";
import { EmployeeStatusBadge } from "@/components/employees/employee-ui";

export const metadata = { title: "Employee Service Credits" };

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ServiceCreditsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "service_credits.view")) redirect("/dashboard");

  const { id } = await params;
  const sp = await searchParams;
  const str = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : "");
  const typeFilter = ["earned", "consumed"].includes(str("type")) ? str("type") : "";
  const from = /^\d{4}-\d{2}-\d{2}$/.test(str("from")) ? str("from") : "";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(str("to")) ? str("to") : "";
  const pageSize = [10, 25, 50, 100].includes(parseInt(str("pageSize"), 10))
    ? parseInt(str("pageSize"), 10)
    : undefined;
  const page = parseInt(str("page"), 10) || 1;

  const employee = await getEmployeeById(id);
  if (!employee) notFound();

  const [summary, txPage] = await Promise.all([
    serviceCreditSummary(employee.id),
    listServiceCreditTransactions(employee.id, { type: typeFilter, from, to, page, pageSize }),
  ]);

  const isArchived = employee.status === "archived";
  // Archived records are read-only by policy — no new transactions, no corrections.
  const canManage =
    hasPermission(user.role, "service_credits.manage") && !isArchived;
  const fullName = `${employee.firstName} ${employee.lastName}`.trim();
  const hasTxFilters = Boolean(typeFilter || from || to);
  const totalPages = Math.max(1, Math.ceil(txPage.total / txPage.pageSize));

  const cards = [
    { label: "Total Earned", value: summary.earned, icon: TrendingUp, tone: "text-emerald-700" },
    { label: "Total Consumed", value: summary.consumed, icon: TrendingDown, tone: "text-amber-700" },
    { label: "Available Balance", value: summary.balance, icon: Wallet, tone: "text-brand-900" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <Link
            href={`/employees/${employee.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#64748B] transition-colors hover:text-action-700"
          >
            <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Back to {fullName}
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900 sm:text-[28px]">
            Service Credits
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#64748B]">
            <span className="font-medium text-[#263449]">
              {fullName} ({employee.employeeNumber})
            </span>
            {employee.position ? <span>· {employee.position}</span> : null}
            {employee.department ? <span>· {employee.department}</span> : null}
            <EmployeeStatusBadge status={employee.status} />
          </p>
        </div>
        {canManage ? (
          <AddServiceCreditModal employeeId={employee.id} employeeName={fullName} balance={summary.balance} />
        ) : null}
      </div>

      {isArchived && hasPermission(user.role, "service_credits.manage") ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          <Archive aria-hidden="true" className="h-4 w-4 shrink-0" />
          This employee record is archived — the ledger is read-only. Transactions cannot be recorded
          or corrected until the record is restored.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardBody className="flex items-center gap-3 py-3.5">
              <span aria-hidden="true" className={`rounded-lg bg-brand-100 p-2 ${c.tone}`}>
                <c.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-[#64748B]">{c.label}</p>
                <p className={`numeric text-xl font-bold tracking-tight ${c.tone}`}>
                  {c.value.toFixed(2)}
                </p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Transaction History"
          description="Every entry preserves who created it and when. Corrections keep the audit trail."
          actions={
            <form
              action={`/employees/${employee.id}/service-credits`}
              method="GET"
              className="flex flex-wrap items-center gap-2"
            >
              <label htmlFor="sc-filter-type" className="sr-only">Type</label>
              <select
                id="sc-filter-type"
                name="type"
                defaultValue={typeFilter}
                className="h-8 rounded-md border border-brand-200 bg-white px-2 text-xs text-[#263449]"
              >
                <option value="">All types</option>
                <option value="earned">Earned</option>
                <option value="consumed">Consumed</option>
              </select>
              <label htmlFor="sc-filter-from" className="sr-only">From date</label>
              <input
                id="sc-filter-from"
                type="date"
                name="from"
                defaultValue={from}
                className="h-8 rounded-md border border-brand-200 bg-white px-2 text-xs text-[#263449]"
                aria-label="From date"
              />
              <label htmlFor="sc-filter-to" className="sr-only">To date</label>
              <input
                id="sc-filter-to"
                type="date"
                name="to"
                defaultValue={to}
                className="h-8 rounded-md border border-brand-200 bg-white px-2 text-xs text-[#263449]"
                aria-label="To date"
              />
              <label htmlFor="sc-filter-size" className="sr-only">Rows per page</label>
              <select
                id="sc-filter-size"
                name="pageSize"
                defaultValue={String(txPage.pageSize)}
                className="h-8 rounded-md border border-brand-200 bg-white px-2 text-xs text-[#263449]"
                aria-label="Rows per page"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
              <button type="submit" className="text-xs font-medium text-action-700 hover:text-action-800">
                Apply
              </button>
              {hasTxFilters ? (
                <Link
                  href={`/employees/${employee.id}/service-credits`}
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
              <Th>Date</Th>
              <Th>Type</Th>
              <Th align="right">Credits</Th>
              <Th>Reason</Th>
              <Th>Reference</Th>
              <Th>Remarks</Th>
              {canManage ? <Th align="right">Correct</Th> : null}
            </tr>
          </thead>
          <tbody>
            {txPage.rows.length === 0 ? (
              <TableEmptyState
                colSpan={canManage ? 7 : 6}
                icon={<Wallet aria-hidden="true" className="h-10 w-10" />}
                title={
                  hasTxFilters
                    ? "No transactions match the selected filters"
                    : "No transactions yet"
                }
                description={
                  hasTxFilters
                    ? "Adjust the type or date range, or clear the filters."
                    : "Earned and consumed service-credit entries will appear here as they are recorded."
                }
              />
            ) : (
              txPage.rows.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-[#F4F7FC]">
                  <Td className="numeric whitespace-nowrap">{fmtDate(t.transactionDate)}</Td>
                  <Td>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                        t.type === "earned"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {t.type === "earned" ? (
                        <TrendingUp aria-hidden="true" className="h-3 w-3" />
                      ) : (
                        <TrendingDown aria-hidden="true" className="h-3 w-3" />
                      )}
                      {t.type === "earned" ? "Earned" : "Consumed"}
                    </span>
                  </Td>
                  <Td align="right" className="numeric font-semibold">
                    {t.type === "earned" ? "+" : "−"}
                    {t.credits.toFixed(2)}
                  </Td>
                  <Td>{t.reason}</Td>
                  <Td className="text-[#64748B]">{t.referenceDocument ?? "—"}</Td>
                  <Td className="max-w-[220px] truncate text-[#64748B]" title={t.remarks ?? undefined}>
                    {t.remarks ?? "—"}
                  </Td>
                  {canManage ? (
                    <Td align="right">
                      <ServiceCreditEditButton
                        transaction={{
                          id: t.id,
                          type: t.type,
                          credits: t.credits,
                          transactionDate: t.transactionDate,
                          reason: t.reason,
                          referenceDocument: t.referenceDocument,
                          remarks: t.remarks,
                        }}
                        employeeId={employee.id}
                        employeeName={fullName}
                        balance={summary.balance}
                      />
                    </Td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
        {txPage.total > txPage.pageSize ? (
          <EmployeePagination
            page={Math.min(txPage.page, totalPages)}
            pageSize={txPage.pageSize}
            total={txPage.total}
            searchParams={sp}
            basePath={`/employees/${employee.id}/service-credits`}
            label="transactions"
          />
        ) : null}
      </Card>
    </div>
  );
}
