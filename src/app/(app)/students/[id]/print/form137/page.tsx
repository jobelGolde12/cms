import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { canAccessStudent } from "@/lib/scope";
import { getStudentGrades, getStudentProfile } from "@/lib/queries";
import { formatDate, fullName } from "@/lib/utils";
import { SCHOOL } from "@/lib/constants";
import { PrintButton } from "@/components/ui/print-button";

export const metadata = { title: "Form 137" };

/**
 * Printable Learner's Permanent Record (Form 137) preview (Registrar domain).
 * STRICTLY read-only — generating or printing this document never mutates
 * student data; generation is only logged in the audit trail via the UI-less
 * report export flow where applicable.
 */
export default async function Form137Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "documents.print")) redirect("/students");

  const { id } = await params;
  if (!(await canAccessStudent(user, { studentId: id }))) redirect("/students");

  const student = await getStudentProfile(id);
  if (!student) redirect("/students");

  const grades = await getStudentGrades(id);

  // Group grades per school year (enrollment row) in chronological order.
  const gradesByYear = new Map<string, typeof grades>();
  for (const g of grades) {
    const list = gradesByYear.get(g.schoolYear) ?? [];
    list.push(g);
    gradesByYear.set(g.schoolYear, list);
  }

  return (
    <div className="space-y-5 print:space-y-0">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#64748B] print:hidden">
        <Link href="/students" className="font-medium hover:text-brand-900">
          Registry
        </Link>
        <ChevronRight aria-hidden="true" className="h-3 w-3 text-brand-300" />
        <Link href={`/students/${student.id}`} className="font-medium hover:text-brand-900">
          {student.studentNumber}
        </Link>
        <ChevronRight aria-hidden="true" className="h-3 w-3 text-brand-300" />
        <span className="font-medium text-brand-900">Form 137</span>
      </nav>

      <div className="flex justify-end print:hidden">
        <PrintButton label="Preview & Print Form 137" />
      </div>

      <div className="mx-auto max-w-3xl rounded-lg border border-brand-200 bg-white p-8 shadow-sm print:max-w-none print:shadow-none print:rounded-none print:border-none print:p-0">
        <div className="border-b-2 border-brand-900 pb-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#64748B]">
            Republic of the Philippines · Department of Education
          </p>
          <h1 className="text-lg font-bold text-brand-900">{SCHOOL.name}</h1>
          <p className="text-[11px] text-[#64748B]">{SCHOOL.address}</p>
          <p className="mt-2 text-sm font-bold uppercase tracking-wide text-brand-900">
            Learner&apos;s Permanent Record (Form 137)
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 text-xs sm:grid-cols-2">
          <div className="flex justify-between gap-3">
            <dt className="text-[#64748B]">Name</dt>
            <dd className="font-semibold text-brand-900">{fullName(student)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#64748B]">Student No.</dt>
            <dd className="numeric font-semibold text-brand-900">{student.studentNumber}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#64748B]">Sex</dt>
            <dd className="capitalize text-brand-800">{student.sex}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#64748B]">Birth Date</dt>
            <dd className="numeric text-brand-800">{formatDate(student.birthDate)}</dd>
          </div>
        </dl>

        {gradesByYear.size === 0 ? (
          <p className="mt-8 text-center text-xs text-brand-400">
            No grades recorded yet for this learner.
          </p>
        ) : (
          [...gradesByYear.entries()].map(([year, rows]) => (
            <table key={year} className="mt-6 w-full border-collapse text-xs">
              <caption className="mb-1 text-left text-[11px] font-bold uppercase tracking-wide text-brand-700">
                {year}
              </caption>
              <thead>
                <tr className="border-y border-brand-300 bg-brand-50/60 text-left">
                  <th className="py-1.5 pr-2 font-semibold text-brand-700">Subject</th>
                  <th className="py-1.5 pr-2 font-semibold text-brand-700">Quarter</th>
                  <th className="py-1.5 text-right font-semibold text-brand-700">Grade</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g) => (
                  <tr key={g.id} className="border-b border-brand-100">
                    <td className="py-1 pr-2 text-brand-800">{g.subjectName}</td>
                    <td className="py-1 pr-2 text-brand-600">{g.periodName}</td>
                    <td className="numeric py-1 text-right font-semibold text-brand-900">{g.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))
        )}

        <div className="mt-10 grid grid-cols-2 gap-8 text-center text-[10px] text-[#64748B]">
          <div className="border-t border-brand-400 pt-1">Registrar</div>
          <div className="border-t border-brand-400 pt-1">School Principal</div>
        </div>
        <p className="mt-6 text-center text-[10px] text-brand-400 print:hidden">
          Generated by {user.firstName} {user.lastName} ({user.role}) on{" "}
          {new Date().toLocaleDateString("en-PH")} — this document is read-only and does not modify
          student records.
        </p>
      </div>
    </div>
  );
}
