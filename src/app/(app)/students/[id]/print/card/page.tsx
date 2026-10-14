import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { canAccessStudent } from "@/lib/scope";
import { getStudentProfile } from "@/lib/queries";
import { formatDate, fullName, ageFromBirthDate } from "@/lib/utils";
import { SCHOOL } from "@/lib/constants";
import { PrintButton } from "@/components/ui/print-button";

export const metadata = { title: "Student Card" };

/**
 * Printable student card (Registrar domain). Read-only: rendering this page
 * never mutates any record. Access requires `documents.print` AND row-level
 * access to the student.
 */
export default async function StudentCardPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "documents.print")) redirect("/students");

  const { id } = await params;
  if (!(await canAccessStudent(user, { studentId: id }))) redirect("/students");

  const student = await getStudentProfile(id);
  if (!student) redirect("/students");

  return (
    <div className="space-y-5 print:space-y-0">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-brand-500 print:hidden">
        <Link href="/students" className="font-medium hover:text-brand-900">
          Registry
        </Link>
        <ChevronRight aria-hidden="true" className="h-3 w-3 text-brand-300" />
        <Link href={`/students/${student.id}`} className="font-medium hover:text-brand-900">
          {student.studentNumber}
        </Link>
        <ChevronRight aria-hidden="true" className="h-3 w-3 text-brand-300" />
        <span className="font-medium text-brand-900">Student Card</span>
      </nav>

      <div className="flex justify-end print:hidden">
        <PrintButton label="Preview & Print" />
      </div>

      {/* Card sheet — 1:1 preview of the printed artifact */}
      <div className="mx-auto max-w-md rounded-lg border-2 border-brand-900 bg-white p-6 shadow-sm print:max-w-none print:shadow-none print:rounded-none">
        <div className="border-b border-brand-900 pb-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-500">
            Republic of the Philippines · Department of Education
          </p>
          <p className="text-sm font-bold text-brand-900">{SCHOOL.name}</p>
          <p className="text-[11px] text-brand-500">{SCHOOL.address}</p>
        </div>

        <div className="mt-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-400">
            Official Student Card
          </p>
          <h1 className="mt-1 text-xl font-bold text-brand-900">{fullName(student)}</h1>
          <p className="numeric mt-0.5 text-xs text-brand-500">
            {student.studentNumber} · {student.sex === "male" ? "Male" : "Female"} ·{" "}
            {ageFromBirthDate(student.birthDate)} yrs
          </p>
        </div>

        <dl className="mt-4 space-y-1.5 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-brand-500">Birth Date</dt>
            <dd className="numeric text-brand-800">{formatDate(student.birthDate)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-brand-500">Record Status</dt>
            <dd className="capitalize text-brand-800">{student.recordStatus.replace(/_/g, " ")}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-brand-500">Address</dt>
            <dd className="text-right text-brand-800">{student.address ?? "—"}</dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-brand-200 pt-3 text-center text-[10px] text-brand-400">
          Generated on {new Date().toLocaleDateString("en-PH")} ·{" "}
          {user.firstName} {user.lastName} ({user.role})
        </div>
      </div>
    </div>
  );
}
