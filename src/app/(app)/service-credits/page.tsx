import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { serviceCreditOverview } from "@/lib/employees";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TableWrap, Th, Td, TableEmptyState } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { CreditBadges } from "@/components/employees/employee-ui";

export default async function ServiceCreditsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "service_credits.view")) redirect("/dashboard");

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const rows = await serviceCreditOverview({ q });

  const totals = rows.reduce(
    (acc, r) => ({
      earned: acc.earned + r.earned,
      consumed: acc.consumed + r.consumed,
    }),
    { earned: 0, consumed: 0 },
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Service Credits"
        title="Service Credits Overview"
        description="Ledger-derived earned, consumed and available service credits per employee."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Total Earned", value: totals.earned, tone: "text-emerald-700" },
          { label: "Total Consumed", value: totals.consumed, tone: "text-amber-700" },
          { label: "Total Available", value: Math.round((totals.earned - totals.consumed) * 100) / 100, tone: "text-brand-900" },
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
          description={`${rows.length} employee${rows.length === 1 ? "" : "s"}`}
          icon={<Wallet aria-hidden="true" className="h-4 w-4" />}
          actions={
            <form action="/service-credits" method="GET" className="flex items-center gap-2">
              <label htmlFor="credits-search" className="sr-only">
                Search employees
              </label>
              <input
                id="credits-search"
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search name or number…"
                autoComplete="off"
                className="h-9 w-52 rounded-md border border-brand-200 bg-[#f8fafc] px-3 text-xs text-brand-800 placeholder:text-brand-400 focus:border-action-500 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-md bg-brand-900 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800"
              >
                Search
              </button>
            </form>
          }
        />
        <TableWrap minWidth={800}>
          <thead>
            <tr>
              <Th>Employee No.</Th>
              <Th>Name</Th>
              <Th>Position</Th>
              <Th>Credits</Th>
              <Th align="right">Ledger</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <TableEmptyState
                colSpan={5}
                icon={<Wallet aria-hidden="true" className="h-10 w-10" />}
                title={q ? "No employees match your search" : "No employees yet"}
                description={q ? "Try a different name or employee number." : undefined}
              />
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-brand-50">
                  <Td className="numeric font-medium">{r.employeeNumber}</Td>
                  <Td>
                    <span className="font-medium text-brand-900">
                      {[r.lastName, r.firstName, r.suffix].filter(Boolean).join(", ")}
                      {r.middleName ? ` ${r.middleName}` : ""}
                    </span>
                  </Td>
                  <Td>{r.position ?? "—"}</Td>
                  <Td>
                    <CreditBadges earned={r.earned} consumed={r.consumed} balance={r.balance} />
                  </Td>
                  <Td align="right">
                    <Link
                      href={`/employees/${r.id}/service-credits`}
                      className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-100 hover:text-brand-900"
                    >
                      Open ledger
                    </Link>
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
