import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  getEmployeeById,
  listServiceCreditTransactions,
  serviceCreditSummary,
} from "@/lib/employees";
import { AddServiceCreditModal } from "@/components/employees/service-credit-modal";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TableWrap, Th, Td, TableEmptyState } from "@/components/ui/table";

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
  const typeFilter = typeof sp.type === "string" ? sp.type : "";

  const employee = await getEmployeeById(id);
  if (!employee) notFound();

  const [summary, transactions] = await Promise.all([
    serviceCreditSummary(employee.id),
    listServiceCreditTransactions(employee.id, { type: typeFilter }),
  ]);

  const canManage = hasPermission(user.role, "service_credits.manage") && employee.status !== "archived";
  const fullName = `${employee.firstName} ${employee.lastName}`.trim();

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
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-500 transition-colors hover:text-action-700"
          >
            <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Back to {fullName}
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900 sm:text-[28px]">
            Service Credits
          </h1>
          <p className="mt-1 text-sm text-brand-500">
            Auditable earned/consumed ledger for{" "}
            <span className="font-medium text-brand-700">
              {fullName} ({employee.employeeNumber})
            </span>
          </p>
        </div>
        {canManage ? (
          <AddServiceCreditModal employeeId={employee.id} employeeName={fullName} balance={summary.balance} />
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
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

      <Card>
        <CardHeader
          title="Transaction History"
          description="Every entry preserves who created it and when. Corrections keep the audit trail."
          actions={
            <form action={`/employees/${employee.id}/service-credits`} method="GET" className="flex items-center gap-2">
              <label htmlFor="sc-filter-type" className="text-xs text-brand-500">
                Type
              </label>
              <select
                id="sc-filter-type"
                name="type"
                defaultValue={typeFilter}
                className="h-8 rounded-md border border-brand-200 bg-white px-2 text-xs text-brand-700"
              >
                <option value="">All</option>
                <option value="earned">Earned</option>
                <option value="consumed">Consumed</option>
              </select>
              <button type="submit" className="text-xs font-medium text-action-700 hover:text-action-800">
                Apply
              </button>
            </form>
          }
        />
        <TableWrap minWidth={760}>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Type</Th>
              <Th align="right">Credits</Th>
              <Th>Reason</Th>
              <Th>Reference</Th>
              <Th>Remarks</Th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <TableEmptyState
                colSpan={6}
                icon={<Wallet aria-hidden="true" className="h-10 w-10" />}
                title="No transactions yet"
                description="Earned and consumed service-credit entries will appear here as they are recorded."
              />
            ) : (
              transactions.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-brand-50">
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
                  <Td className="text-brand-600">{t.referenceDocument ?? "—"}</Td>
                  <Td className="max-w-[220px] truncate text-brand-600" title={t.remarks ?? undefined}>
                    {t.remarks ?? "—"}
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
