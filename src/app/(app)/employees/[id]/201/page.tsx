import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getEmployeeById, listEmployee201Records } from "@/lib/employees";
import {
  EMPLOYEE_201_CATEGORIES,
  EMPLOYEE_201_CATEGORY_LABELS,
  type Employee201Category,
} from "@/lib/constants";
import { archive201RecordForm } from "@/actions/employees";
import { Add201RecordModal, Edit201RecordModal } from "@/components/employees/record-201-modal";
import { Card, CardHeader } from "@/components/ui/card";
import { TableWrap, Th, Td, TableEmptyState } from "@/components/ui/table";
import { FileText, Archive } from "lucide-react";

export default async function Employee201Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "employee_201.view")) redirect("/dashboard");

  const { id } = await params;
  const employee = await getEmployeeById(id);
  if (!employee) notFound();

  const records = await listEmployee201Records(id, { includeArchived: true });
  const canManage = hasPermission(user.role, "employee_201.manage");
  const fullName = `${employee.firstName} ${employee.lastName}`.trim();

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
            201 File
          </h1>
          <p className="mt-1 text-sm text-brand-500">
            Personnel record of{" "}
            <span className="font-medium text-brand-700">
              {fullName} ({employee.employeeNumber})
            </span>
          </p>
        </div>
        {canManage && employee.status !== "archived" ? (
          <Add201RecordModal employeeId={employee.id} />
        ) : null}
      </div>

      {EMPLOYEE_201_CATEGORIES.map((category) => {
        const rows = records.filter((r) => r.category === category);
        if (rows.length === 0) return null;

        return (
          <Card key={category}>
            <CardHeader
              title={EMPLOYEE_201_CATEGORY_LABELS[category as Employee201Category]}
              description={`${rows.filter((r) => !r.isArchived).length} active entr${rows.filter((r) => !r.isArchived).length === 1 ? "y" : "ies"}`}
              icon={<FileText aria-hidden="true" className="h-4 w-4" />}
            />
            <TableWrap minWidth={640}>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Title</Th>
                  <Th>Description</Th>
                  <Th>Reference</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={`transition-colors hover:bg-brand-50 ${r.isArchived ? "opacity-55" : ""}`}
                  >
                    <Td className="numeric whitespace-nowrap">{r.recordDate}</Td>
                    <Td>
                      <span className="font-medium text-brand-900">{r.title}</span>
                      {r.isArchived ? (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                          <Archive aria-hidden="true" className="h-3 w-3" />
                          Archived
                        </span>
                      ) : null}
                    </Td>
                    <Td className="max-w-[320px] truncate text-brand-600" title={r.description ?? undefined}>
                      {r.description ?? "—"}
                    </Td>
                    <Td className="numeric text-brand-600">{r.fileReference ?? "—"}</Td>
                    <Td align="right">
                      <div className="flex justify-end gap-1">
                        {canManage && !r.isArchived ? <Edit201RecordModal record={{ ...r, employeeId: employee.id }} /> : null}
                        {canManage && !r.isArchived ? (
                          <form action={archive201RecordForm}>
                            <input type="hidden" name="recordId" value={r.id} />
                            <button
                              type="submit"
                              aria-label={`Archive ${r.title}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-brand-600 transition-colors hover:bg-red-50 hover:text-red-700"
                            >
                              <Archive aria-hidden="true" className="h-4 w-4" />
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </Card>
        );
      })}

      {records.length === 0 ? (
        <Card>
          <TableWrap minWidth={640}>
            <tbody>
              <TableEmptyState
                colSpan={5}
                icon={<FileText aria-hidden="true" className="h-10 w-10" />}
                title="The 201 file is empty"
                description="Add appointment, eligibility, training and other personnel documents as they are issued."
              />
            </tbody>
          </TableWrap>
        </Card>
      ) : null}
    </div>
  );
}
