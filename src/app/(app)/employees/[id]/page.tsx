import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Archive, RotateCcw } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getEmployeeById } from "@/lib/employees";
import {
  APPOINTMENT_STATUS_LABELS,
  CIVIL_STATUS_LABELS,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  type AppointmentStatus,
  type CivilStatus,
  type EmployeeStatus,
  type EmploymentType,
} from "@/lib/constants";
import { archiveEmployeeForm, reactivateEmployeeForm } from "@/actions/employees";
import { EditEmployeeModal } from "@/components/employees/add-employee-modal";
import { EmployeeStatusBadge } from "@/components/employees/employee-ui";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

function formatDateTime(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-brand-100 py-2 last:border-none sm:flex-row sm:items-baseline sm:justify-between">
      <dt className="text-xs font-medium text-[#64748B]">{label}</dt>
      <dd className="text-[13px] text-brand-900">{value ?? "—"}</dd>
    </div>
  );
}

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "employees.view")) redirect("/dashboard");

  const { id } = await params;
  const employee = await getEmployeeById(id);
  if (!employee || employee.status === "archived") {
    // Archived records stay visible to auditors, but not to the default nav.
    notFound();
  }

  const canUpdate = hasPermission(user.role, "employees.update");
  const canArchive = hasPermission(user.role, "employees.archive");

  const fullName = [
    employee.firstName,
    employee.middleName,
    employee.lastName,
    employee.suffix,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-action-700">
            Employee Record
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900 sm:text-[28px]">
            {fullName}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#64748B]">
            <span className="numeric font-medium text-brand-700">{employee.employeeNumber}</span>
            <span aria-hidden="true">•</span>
            <EmployeeStatusBadge status={employee.status} />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canUpdate ? <EditEmployeeModal employee={employee} /> : null}
          {canArchive && employee.status === "active" ? (
            <form action={archiveEmployeeForm}>
              <input type="hidden" name="employeeId" value={employee.id} />
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-brand-300 bg-white px-3 text-[13px] font-medium text-red-700 transition-colors hover:bg-red-50"
              >
                <Archive aria-hidden="true" className="h-4 w-4" />
                Archive
              </button>
            </form>
          ) : null}
          {canArchive && employee.status === "inactive" ? (
            <form action={reactivateEmployeeForm}>
              <input type="hidden" name="employeeId" value={employee.id} />
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-brand-300 bg-white px-3 text-[13px] font-medium text-brand-700 transition-colors hover:bg-brand-100"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Restore
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Personal Information" />
          <CardBody>
            <dl>
              <InfoRow label="Employee number" value={<span className="numeric">{employee.employeeNumber}</span>} />
              <InfoRow label="Birth date" value={employee.birthDate} />
              <InfoRow label="Sex" value={employee.sex === "male" ? "Male" : employee.sex === "female" ? "Female" : employee.sex} />
              <InfoRow
                label="Civil status"
                value={
                  employee.civilStatus
                    ? (CIVIL_STATUS_LABELS[employee.civilStatus as CivilStatus] ?? employee.civilStatus)
                    : null
                }
              />
              <InfoRow label="Address" value={employee.address} />
              <InfoRow label="Contact number" value={employee.contactNumber} />
              <InfoRow label="Email" value={employee.email} />
              <InfoRow
                label="Emergency contact"
                value={
                  employee.emergencyContactName
                    ? `${employee.emergencyContactName}${employee.emergencyContactRelation ? ` (${employee.emergencyContactRelation})` : ""}${employee.emergencyContactNumber ? ` — ${employee.emergencyContactNumber}` : ""}`
                    : null
                }
              />
            </dl>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Employment Information" />
          <CardBody>
            <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <InfoRow label="Position" value={employee.position} />
              <InfoRow label="Designation" value={employee.designation} />
              <InfoRow
                label="Appointment status"
                value={
                  employee.appointmentStatus
                    ? (APPOINTMENT_STATUS_LABELS[employee.appointmentStatus as AppointmentStatus] ??
                      employee.appointmentStatus)
                    : null
                }
              />
              <InfoRow
                label="Employment type"
                value={
                  employee.employmentType
                    ? (EMPLOYMENT_TYPE_LABELS[employee.employmentType as EmploymentType] ?? employee.employmentType)
                    : null
                }
              />
              <InfoRow label="Department / office" value={employee.department} />
              <InfoRow label="Date hired" value={employee.dateHired} />
              <InfoRow label="Date of appointment" value={employee.dateOfAppointment} />
              <InfoRow
                label="Salary grade / step"
                value={
                  employee.salaryGrade || employee.step
                    ? [employee.salaryGrade, employee.step].filter(Boolean).join(" — ")
                    : null
                }
              />
              <InfoRow label="GSIS number" value={employee.gsisNumber} />
              <InfoRow label="PhilHealth number" value={employee.philhealthNumber} />
              <InfoRow label="Pag-IBIG number" value={employee.pagibigNumber} />
              <InfoRow label="TIN" value={employee.tinNumber} />
              <InfoRow label="PRC license no." value={employee.prcLicenseNumber} />
              <InfoRow label="Eligibility" value={employee.eligibility} />
            </dl>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Record" />
        <CardBody>
          <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-3">
            <InfoRow label="Created" value={formatDateTime(employee.createdAt)} />
            <InfoRow label="Last updated" value={formatDateTime(employee.updatedAt)} />
            <InfoRow
              label="Lifecycle"
              value={EMPLOYEE_STATUS_LABELS[employee.status as EmployeeStatus] ?? employee.status}
            />
          </dl>
        </CardBody>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/employees/${employee.id}/201`}
          className="inline-flex h-11 items-center rounded-lg bg-action-700 px-4 text-sm font-medium text-white transition-colors hover:bg-action-800"
        >
          Open 201 File
        </Link>
        <Link
          href={`/employees/${employee.id}/service-credits`}
          className="inline-flex h-11 items-center rounded-lg border border-brand-300 bg-white px-4 text-sm font-medium text-brand-800 transition-colors hover:bg-brand-100"
        >
          Service Credits
        </Link>
      </div>
    </div>
  );
}
