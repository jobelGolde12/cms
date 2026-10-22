import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Download } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { canAccessStudent } from "@/lib/scope";
import { getReportCardData, REPORT_CARD_MONTHS } from "@/lib/report-card";
import { SCHOOL } from "@/lib/constants";
import { buttonStyles } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/print-button";
import schoolLogo from "../../../../../../../public/logo.png";
import depedLogo from "../../../../../../../public/deped_logo_kagawaran_ng_edukasyon.jpg";

export const metadata = { title: "Student Card" };

const TIMES = '"Times New Roman", Times, serif';

const fmt = (n: number | null | undefined) => (n == null ? "" : String(n));
const orBlank = (s: string | null | undefined) => s ?? "";

function FieldValue({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <span className={`flex items-end gap-0 ${className}`}>
      <span className="shrink-0">{label}: </span>
      <span className="flex h-[15px] min-w-0 flex-1 items-center justify-center border-b border-neutral-900 px-1 text-center">
        {value}
      </span>
    </span>
  );
}

export default async function StudentCardPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "documents.print")) redirect("/students");

  const { id } = await params;
  if (!(await canAccessStudent(user, { studentId: id }))) redirect("/students");

  const data = await getReportCardData(id);
  if (!data) redirect("/students");

  const sex = data.student.sex
    ? data.student.sex.charAt(0).toUpperCase() + data.student.sex.slice(1)
    : "";
  const gradeSection = data.gradeLevel
    ? `${data.gradeLevel}${data.section ? ` - ${data.section}` : ""}`
    : "";

  return (
    <div className="space-y-5 print:space-y-0">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#64748B] print:hidden">
        <Link href="/students" className="font-medium hover:text-brand-900">
          Registry
        </Link>
        <ChevronRight aria-hidden="true" className="h-3 w-3 text-brand-300" />
        <Link href={`/students/${id}`} className="font-medium hover:text-brand-900">
          {data.student.studentNumber}
        </Link>
        <ChevronRight aria-hidden="true" className="h-3 w-3 text-brand-300" />
        <span className="font-medium text-brand-900">Student Card</span>
      </nav>

      <div className="flex justify-end gap-2 print:hidden">
        <a
          href={`/api/report-card/${id}`}
          className={buttonStyles("outline", "sm")}
        >
          <Download aria-hidden="true" className="h-3.5 w-3.5" />
          Download PDF
        </a>
        <PrintButton label="Preview & Print" />
      </div>

      {/* A4 sheet — 1:1 preview of the printed artifact */}
      <div
        className="mx-auto rounded-lg border border-brand-200 bg-white shadow-sm print:max-w-none print:rounded-none print:border-none print:shadow-none"
        style={{ maxWidth: "210mm" }}
      >
        <div
          className="px-[15mm] pb-[14mm] pt-[10mm] text-[10.5px] leading-snug text-neutral-900"
          style={{ fontFamily: TIMES }}
        >
          {/* Official letterhead — left DepEd logo, center info, right school logo */}
          <header className="flex items-start gap-4">
            <Image
              src={depedLogo}
              alt="DepEd Logo"
              width={90}
              height={90}
              className="shrink-0"
              style={{ width: 90, height: 90, objectFit: "contain" }}
            />
            <div className="min-w-0 flex-1 text-center leading-tight">
              <p>Republic of the Philippines</p>
              <p>Department of Education</p>
              <p>Region V</p>
              <p>SCHOOLS DIVISION OF SORSOGON</p>
              <p className="text-[11.5px] font-bold">{SCHOOL.name.toUpperCase()}</p>
              <p>{SCHOOL.address}</p>
            </div>
            <Image
              src={schoolLogo}
              alt="School seal"
              width={90}
              height={90}
              className="shrink-0"
              style={{ width: 90, height: 90, objectFit: "contain" }}
            />
          </header>

          {/* Document title */}
          <div className="mt-2 text-center">
            <h1 className="text-[13px] font-bold tracking-wide">
              LEARNER&apos;S PERFORMANCE REPORT
            </h1>
            <p className="mt-0.5 text-[11px]">
              School Year {data.schoolYear || "—"}
            </p>
          </div>

          {/* Learner information — ruled fields */}
          <section>
            <div className="mt-2.5 flex items-end gap-4">
              <FieldValue label="Name" value={data.student.fullName || ""} className="w-[46%]" />
              <FieldValue label="Age" value={fmt(data.student.age)} className="w-[13%]" />
              <FieldValue label="Sex" value={sex} className="w-[16%]" />
            </div>
            <div className="mt-1.5 flex items-end gap-4">
              <FieldValue label="LRN" value={orBlank(data.student.lrn)} className="w-[42%]" />
              <FieldValue label="Grade & Section" value={gradeSection} className="w-[41%]" />
            </div>
            <div className="mt-1.5 flex items-end">
              <FieldValue label="Track" value="" className="w-[59%]" />
            </div>
          </section>

          {!data.hasEnrollment ? (
            <div className="mt-4 border border-neutral-900 px-4 py-5 text-center">
              No enrollment record found for this learner
              {data.schoolYear ? ` in School Year ${data.schoolYear}` : ""}. No academic or
              attendance data is shown until an enrollment exists.
            </div>
          ) : (
            <>
              {/* Note to parents */}
              <section>
                <p className="mt-2.5 text-[11px]">Dear Parents,</p>
                <p className="mt-1 text-justify leading-relaxed">
                  This Performance Report shows the ability and progress your child has made in
                  the different learning areas as well as his/her core values. The school welcomes
                  you should you desire to know more about your child&apos;s progress.
                </p>
              </section>

              {/* Learning Progress and Achievement */}
              <h2 className="mt-3 text-center text-[11px] font-bold uppercase" style={{ letterSpacing: "0.02em" }}>
                Learning Progress and Achievement
              </h2>
              <table className="mt-1 w-full table-fixed border-collapse text-[10px]">
                <colgroup>
                  <col className="w-[36%]" />
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                  <col className="w-[15%]" />
                  <col className="w-[22%]" />
                </colgroup>
                <thead>
                  <tr>
                    <th rowSpan={2} className="border border-neutral-900 px-1 py-0.5 text-center font-bold align-middle">
                      Learning Areas
                    </th>
                    <th colSpan={3} className="border border-neutral-900 px-1 py-0.5 text-center font-bold">
                      TERM
                    </th>
                    <th rowSpan={2} className="border border-neutral-900 px-1 py-0.5 text-center font-bold align-middle">
                      Final Grade
                    </th>
                    <th rowSpan={2} className="border border-neutral-900 px-1 py-0.5 text-center font-bold align-middle">
                      Remarks
                    </th>
                  </tr>
                  <tr>
                    <th className="border border-neutral-900 px-1 py-0.5 text-center font-bold">1</th>
                    <th className="border border-neutral-900 px-1 py-0.5 text-center font-bold">2</th>
                    <th className="border border-neutral-900 px-1 py-0.5 text-center font-bold">3</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border border-neutral-900 px-2 py-2 text-center text-neutral-600">
                        No grades recorded for this learner yet.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {data.subjects.map((s) => (
                        <tr key={s.subjectCode} className="break-inside-avoid">
                          <td className="border border-neutral-900 px-1.5 py-0.5 text-left">{s.subjectName}</td>
                          {[0, 1, 2].map((i) => (
                            <td key={i} className="border border-neutral-900 px-1 py-0.5 text-center">
                              {fmt(s.termGrades[i])}
                            </td>
                          ))}
                          <td className="border border-neutral-900 px-1 py-0.5 text-center font-medium">
                            {fmt(s.finalGrade)}
                          </td>
                          <td className="border border-neutral-900 px-1 py-0.5 text-center">
                            {orBlank(s.remark)}
                          </td>
                        </tr>
                      ))}
                      <tr className="break-inside-avoid font-bold">
                        <td className="border border-neutral-900 px-1.5 py-0.5 text-left">General Average</td>
                        <td className="border border-neutral-900" />
                        <td className="border border-neutral-900" />
                        <td className="border border-neutral-900" />
                        <td className="border border-neutral-900 px-1 py-0.5 text-center">
                          {fmt(data.generalAverage)}
                        </td>
                        <td className="border border-neutral-900" />
                      </tr>
                    </>
                  )}
                </tbody>
              </table>

              {/* Performance descriptors */}
              <h2 className="mt-3 text-center text-[11px] font-bold uppercase">
                Performance Descriptors
              </h2>
              <table className="mt-1 w-full border-collapse text-[10px]">
                <colgroup>
                  <col className="w-[20%]" />
                  <col className="w-[40%]" />
                  <col className="w-[40%]" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="border border-neutral-900 px-1 py-0.5 text-center font-bold">Grading Scale</th>
                    <th className="border border-neutral-900 px-1 py-0.5 text-center font-bold">Description</th>
                    <th className="border border-neutral-900 px-1 py-0.5 text-center font-bold">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["90-100", "Advancing", "Passed"],
                    ["80-89", "Benchmarking", "Passed"],
                    ["75-79", "Connecting", "Passed"],
                    ["65-74", "Developing", "Failed"],
                    ["0-64", "Emerging", "Failed"],
                  ].map(([range, descriptor, remark]) => (
                    <tr key={range}>
                      <td className="border border-neutral-900 px-1 py-0.5 text-center">{range}</td>
                      <td className="border border-neutral-900 px-1 py-0.5 text-center">{descriptor}</td>
                      <td className="border border-neutral-900 px-1 py-0.5 text-center">{remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Attendance record */}
              <h2 className="mt-3 text-center text-[11px] font-bold uppercase">
                Attendance Record
              </h2>
              <table className="mt-1 w-full table-fixed border-collapse text-[9px]">
                <colgroup>
                  <col className="w-[18%]" />
                  {REPORT_CARD_MONTHS.map((m) => (
                    <col key={m} className="w-[6.36%]" />
                  ))}
                  <col className="w-[12%]" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="border border-neutral-900 px-0.5 text-left font-normal">Month</th>
                    {REPORT_CARD_MONTHS.map((m) => (
                      <th key={m} className="border border-neutral-900 px-0.5 py-0.5 text-center font-bold">
                        {m}
                      </th>
                    ))}
                    <th className="border border-neutral-900 px-1 py-0.5 text-center font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "No. of Class Days", key: "schoolDays" as const, totalOf: (a: typeof data.attendance) => a.totalSchoolDays },
                    { label: "No. of Days Present", key: "present" as const, totalOf: (a: typeof data.attendance) => a.totalPresent },
                    { label: "No. of Days Absent", key: "absent" as const, totalOf: (a: typeof data.attendance) => a.totalAbsent },
                  ].map((r) => (
                    <tr key={r.key}>
                      <td className="border border-neutral-900 px-1 py-0.5 text-left">{r.label}</td>
                      {REPORT_CARD_MONTHS.map((m) => {
                        const v = data.attendance.months.find((mv) => mv.month === m);
                        return (
                          <td key={m} className="border border-neutral-900 px-0.5 py-0.5 text-center">
                            {v ? fmt(v[r.key]) : ""}
                          </td>
                        );
                      })}
                      <td className="border border-neutral-900 px-1 py-0.5 text-center font-bold">
                        {fmt(r.totalOf(data.attendance))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Teacher's comments / remarks — blank ruled lines */}
              <h3 className="mt-3 font-bold uppercase">Teacher&apos;s Comments/Remarks</h3>
              <div className="mt-1 flex gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-1 items-end gap-1">
                    <span className="text-[9px]">Term {i}</span>
                    <span className="flex-1 border-b border-neutral-900" />
                  </div>
                ))}
              </div>

              <h3 className="mt-2.5 font-bold uppercase">Parents/Guardian&apos;s Signature</h3>
              <div className="mt-1 flex gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-1 items-end gap-1">
                    <span className="flex-1 border-b border-neutral-900" />
                  </div>
                ))}
              </div>

              {/* Certificate of transfer */}
              <h3 className="mt-3 font-bold uppercase">Certificate of Transfer</h3>
              <p className="mt-1 leading-relaxed">
                This is to certify that the above-named learner has satisfactorily completed the
                requirements for the grade level indicated.
              </p>
              <div className="mt-2 flex items-end">
                <FieldValue label="Admitted to Grade" value="" className="w-[40%]" />
              </div>
              <div className="mt-1.5 flex items-end">
                <FieldValue label="Eligible for Admission to Grade" value="" className="w-[43%]" />
              </div>
              <p className="mt-2.5">Approved:</p>
              <div className="mt-1 flex justify-between">
                <div className="w-[45%] text-center">
                  <p className="text-[11px] font-semibold">{data.principal ?? "\u00a0"}</p>
                  <p className="text-[9.5px]">Secondary School Principal III</p>
                </div>
                <div className="w-[45%] text-center">
                  <p className="text-[11px] font-semibold">{data.adviser ?? "\u00a0"}</p>
                  <p className="text-[9.5px]">Adviser</p>
                </div>
              </div>

              {/* Cancellation of eligibility to transfer */}
              <h3 className="mt-3 font-bold uppercase">Cancellation of Eligibility to Transfer</h3>
              <div className="mt-1.5 flex items-end gap-5">
                <FieldValue label="Admitted in" value="" className="w-[32%]" />
                <FieldValue label="Date" value="" className="w-[34%]" />
              </div>
              <div className="mt-1 flex justify-start">
                <div className="w-[45%] text-center">
                  <p className="text-[11px] font-semibold">{data.principal ?? "\u00a0"}</p>
                  <p className="text-[9.5px]">Secondary School Principal III</p>
                </div>
              </div>
            </>
          )}

          <p className="mt-6 text-center text-[9px] text-brand-400 print:hidden">
            Generated by {user.firstName} {user.lastName} ({user.role}) — read-only document; no
            student data is modified.
          </p>
        </div>
      </div>
    </div>
  );
}
