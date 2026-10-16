import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { listEmployees, employeeRegistryStats } from "@/lib/employees";
import { AddEmployeeModal } from "@/components/employees/add-employee-modal";
import {
  EmployeeKpiGrid,
  EmployeeFilters,
  EmployeeTable,
  EmployeePagination,
  EmployeeModuleInfo,
} from "@/components/employees/employee-ui";
import { PageHeader } from "@/components/ui/page-header";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "employees.view")) redirect("/dashboard");

  const params = await searchParams;
  const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const q = str("q");
  const status = str("status");
  const employmentType = str("employmentType");
  const appointmentStatus = str("appointmentStatus");
  const sort = ["name", "oldest"].includes(str("sort")) ? str("sort") : "recent";
  const page = parseInt(str("page"), 10) || 1;
  const pageSize = parseInt(str("pageSize"), 10) || 10;

  const [result, stats] = await Promise.all([
    listEmployees({ q, status, employmentType, appointmentStatus, sort, page, pageSize }),
    employeeRegistryStats(),
  ]);

  const canCreate = hasPermission(user.role, "employees.create");
  const hasFilters = Boolean(q || employmentType || appointmentStatus || status !== "active");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Employee Records"
        title="Employees"
        description="Personnel records, 201 files and service credits for school employees."
        actions={
          canCreate ? <AddEmployeeModal /> : null
        }
      />

      <EmployeeKpiGrid stats={stats} />

      <EmployeeFilters
        values={{ q, status: status || "active", employmentType, appointmentStatus, sort }}
      />

      <section className="overflow-x-auto rounded-lg border border-brand-200 bg-white shadow-xs">
        <EmployeeTable rows={result.rows} hasFilters={hasFilters} />
        <EmployeePagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          searchParams={params}
        />
      </section>

      <EmployeeModuleInfo />
    </div>
  );
}
