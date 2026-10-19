import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Download } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { canAccessStudent } from "@/lib/scope";
import {
  REPORT_CARD_MONTHS,
  getReportCardData,
  type ReportCardData,
  type ReportCardSubject,
} from "@/lib/report-card";
import { SCHOOL } from "@/lib/constants";
import { buttonStyles } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/print-button";

export const metadata = { title: "Learner's Performance Report" };

/**
 * Learner's Performance Report preview (Registrar domain).
 * STRICTLY read-only — rendering this document never mutates student data
 * (same guarantee as the student card and Form 137).
 *
 * Visual reference is CARD.docx: A4 portrait, government header, student
 * details, learning-progress table, descriptor scale, attendance and
 * certificates. Uses print modifiers so browser `window.print()` output
 * matches the on-screen document.
 */

const fmt = (n: number | null | undefined) =>
  n == null ? "" : String(n);

const grade = (n: number | null) =>
  n == null ? "" : String(n);

export default async function ReportCardPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "documents.print")) redirect("/students");

  const { id } = await params;
  if (!(await canAccessStudent(user, { studentId: id }))) redirect("/students");

  const data = await getReportCardData(id);
  if (!data) redirect("/students");

  return (
    <div className="space-y-5 print:space-y-0">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-brand-500 print:hidden">
        <Link href="/students" className="font-medium hover:text-brand-900">
          Registry
        </Link>
        <ChevronRight aria-hidden="true" className="h-3 w-3 text-brand-300" />
        <Link href={`/students/${id}`} className="font-medium hover:text-brand-900">
          {data.student.studentNumber}
        </Link>
        <ChevronRight aria-hidden="true" className="h-3 w-3 text-brand-300" />
        <span className="font-medium text-brand-900">Performance Report</span>
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

      {/* A4 sheet — 1:1 preview of the printed artifact (CARD.docx) */}
      <div
        className="mx-auto rounded-lg border border-brand-200 bg-white shadow-sm print:max-w-none print:shadow-none print:rounded-none print:border-none"
        style={{ maxWidth: "210mm" }}
      >
        <div className="px-[14mm] py-[12mm] font-serif text-[10px] leading-snug text-brand-900">
          {/* Government header */}
          <header className="text-center">
            <p>Republic of the Philippines</p>
            <p className="font-semibold tracking-wide">DEPARTMENT OF EDUCATION</p>
            <p>Region V</p>
            <p className="font-semibold tracking-wide">SCHOOLS DIVISION OF SORSOGON</p>
            <p className="mt-1 font-bold uppercase">{SCHOOL.name}</p>
            <p>{SCHOOL.address}</p>
            <h1 className="mt-3 text-sm font-bold tracking-wide">
              LEARNER&apos;S PERFORMANCE REPORT
            </h1>
            <p className="mt-1">
              {data.schoolYear
                ? `School Year ${data.schoolYear}`
                : "School Year —"}
            </p>
          </header>

          {/* Learner details */}
          <section className="mt-4 grid grid-cols-1 gap-x-10 gap-y-1 sm:grid-cols-2">
            <Detail label="Name" value={data.student.fullName || "—"} />
            <Detail label="Age" value={fmt(data.student.age)} />
            <Detail
              label="Sex"
              value={data.student.sex ? capitalize(data.student.sex) : "—"}
            />
            {/* No `lrn` column exists (documented gap) — student number is the identifier. */}
            <Detail label="LRN / Student No." value={data.student.studentNumber} />
            <Detail
              label="Grade &amp; Section"
              value={
                data.gradeLevel
                  ? `${data.gradeLevel}${data.section ? ` — ${data.section}` : ""}`
                  : "—"
              }
            />
            <Detail label="Track" value="" note="not tracked in the system" />
          </section>

          {!data.hasEnrollment ? (
            <EmptyState schoolYear={data.schoolYear} />
          ) : (
            <>
              <p className="mt-4 text-center text-[9px] leading-relaxed text-brand-700">
                Dear Parents, this report serves as the school&apos;s official record of the
                learner&apos;s comparative progress and achievement in the learning areas and
                the values demonstrated during the grading period(s). This will serve as basis
                in monitoring the learner&apos;s development in school.
              </p>

              {/* Learning Progress and Achievement */}
              <GradeTable subjects={data.subjects} generalAverage={data.generalAverage} />

              {/* Descriptor scale */}
              <DescriptorScale />

              {/* Attendance */}
              <AttendanceTable data={data} />

              {/* Comments and signatures */}
              <section className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <p className="mb-2 font-semibold">Teacher&apos;s Remarks</p>
                  <SignatureLines count={3} leftLabel="Term" />
                </div>
                <div>
                  <p className="mb-2 font-semibold">Parents&apos;/Guardian&apos;s Signature</p>
                  <SignatureLines count={3} leftLabel="Term" />
                </div>
              </section>

              {/* Certificate of transfer */}
              <section className="mt-5 border-t border-brand-900 pt-3">
                <p className="font-semibold uppercase tracking-wide">Certificate of Transfer (if applicable)</p>
                <div className="mt-2 space-y-1.5">
                  <UnderlineField label="Admitted to Grade" />
                  <UnderlineField label="Eligible for Admission to Grade" />
                  <UnderlineField label="Cancelled — Eligibility to Transfer (Admitted in)" />
                  <UnderlineField label="Date" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-8 text-center text-[10px]">
                  <div>
                    <p className="border-t border-brand-400 pt-1 font-semibold">
                      {data.adviser ?? "\u00a0"}
                    </p>
                    <p className="text-[9px] text-brand-600">Adviser</p>
                  </div>
                  <div>
                    <p className="border-t border-brand-400 pt-1 font-semibold">
                      {data.principal ?? "\u00a0"}
                    </p>
                    <p className="text-[9px] text-brand-600">Principal</p>
                  </div>
                </div>
              </section>
            </>
          )}

          <p className="mt-6 text-center text-[9px] text-brand-400 print:hidden">
            Generated by {user.firstName} {user.lastName} ({user.role}) on{" "}
            {new Date().toLocaleDateString("en-PH")} — read-only document; no student data is
            modified.
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Small building blocks                                                     */
/* -------------------------------------------------------------------------- */

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Detail({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-brand-600">{label}:</span>
      <span className="min-w-[45%] border-b border-brand-400 text-right font-medium">
        {note ? <span className="text-brand-300">{note}</span> : value || "\u00a0"}
      </span>
    </div>
  );
}

function UnderlineField({ label }: { label: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-brand-600">{label}:</span>
      <span className="min-w-[55%] border-b border-brand-400" />
    </div>
  );
}

function GradeTable({
  subjects,
  generalAverage,
}: {
  subjects: ReportCardSubject[];
  generalAverage: number | null;
}) {
  return (
    <section className="mt-4">
      <p className="mb-1 font-semibold uppercase tracking-wide">
        Learning Progress and Achievement
      </p>
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[38%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[15%]" />
          <col className="w-[17%]" />
        </colgroup>
        <thead>
          <tr className="bg-brand-50/60 text-center align-middle">
            <th className="border border-brand-900 px-1 py-1 font-semibold">Learning Areas</th>
            <th className="border border-brand-900 px-1 py-1 font-semibold">Term 1</th>
            <th className="border border-brand-900 px-1 py-1 font-semibold">Term 2</th>
            <th className="border border-brand-900 px-1 py-1 font-semibold">Term 3</th>
            <th className="border border-brand-900 px-1 py-1 font-semibold">Final Grade</th>
            <th className="border border-brand-900 px-1 py-1 font-semibold">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {subjects.length === 0 ? (
            <tr>
              <td colSpan={6} className="border border-brand-900 px-2 py-3 text-center text-brand-400">
                No grades recorded for this learner yet.
              </td>
            </tr>
          ) : (
            <>
              {subjects.map((s) => (
                <tr key={s.subjectCode} className="border border-brand-900">
                  <td className="border border-brand-900 px-1.5 py-0.5 text-left">{s.subjectName}</td>
                  <Cell value={s.termGrades[0]} />
                  <Cell value={s.termGrades[1]} />
                  <Cell value={s.termGrades[2]} />
                  <Cell value={s.finalGrade} />
                  <td className="border border-brand-900 px-1 py-0.5 text-center">
                    {s.remark ?? ""}
                  </td>
                </tr>
              ))}
              <tr className="border border-brand-900 font-semibold">
                <td className="border border-brand-900 px-1.5 py-0.5 text-left">General Average</td>
                <Cell value={generalAverage} bold />
                <td className="border border-brand-900" />
                <td className="border border-brand-900" />
                <td className="border border-brand-900" />
                <td className="border border-brand-900" />
              </tr>
            </>
          )}
        </tbody>
      </table>
    </section>
  );
}

function Cell({ value, bold = false }: { value: number | null; bold?: boolean }) {
  return (
    <td className={`border border-brand-900 px-1 py-0.5 text-center ${bold ? "font-semibold" : ""}`}>
      {grade(value)}
    </td>
  );
}

const DESCRIPTOR_SCALE: [string, string, string][] = [
  ["90 – 100", "Advancing", "Passed"],
  ["80 – 89", "Benchmarking", "Passed"],
  ["75 – 79", "Connecting", "Passed"],
  ["65 – 74", "Developing", "Failed"],
  ["0 – 64", "Emerging", "Failed"],
];

function DescriptorScale() {
  return (
    <section className="mt-4">
      <p className="mb-1 font-semibold uppercase tracking-wide">
        Learner&apos;s Performance Descriptor
      </p>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border border-brand-900 bg-brand-50/60">
            <th className="border border-brand-900 px-1 py-0.5 font-semibold">Grade Level Range</th>
            <th className="border border-brand-900 px-1 py-0.5 font-semibold">Descriptor</th>
            <th className="border border-brand-900 px-1 py-0.5 font-semibold">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {DESCRIPTOR_SCALE.map(([range, descriptor, remark]) => (
            <tr key={range} className="border border-brand-900 text-center">
              <td className="border border-brand-900 px-1 py-0.5">{range}</td>
              <td className="border border-brand-900 px-1 py-0.5">{descriptor}</td>
              <td className="border border-brand-900 px-1 py-0.5">{remark}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function AttendanceTable({ data }: { data: ReportCardData }) {
  const { months } = data.attendance;
  const byMonth = new Map(months.map((m) => [m.month, m]));
  const rows: { label: string; key: "schoolDays" | "present" | "absent" }[] = [
    { label: "No. of Class Days", key: "schoolDays" },
    { label: "No. of Days Present", key: "present" },
    { label: "No. of Days Absent", key: "absent" },
  ];
  const totalKey: Record<string, number> = {
    schoolDays: data.attendance.totalSchoolDays,
    present: data.attendance.totalPresent,
    absent: data.attendance.totalAbsent,
  };

  return (
    <section className="mt-4">
      <p className="mb-1 font-semibold uppercase tracking-wide">Attendance Report</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[120mm] border-collapse">
          <thead>
            <tr className="border border-brand-900 bg-brand-50/60 text-center">
              <th className="border border-brand-900 px-1 py-0.5 text-left font-normal">Month</th>
              {REPORT_CARD_MONTHS.map((m) => (
                <th key={m} className="border border-brand-900 px-0.5 py-0.5 font-semibold">
                  {m}
                </th>
              ))}
              <th className="border border-brand-900 px-1 py-0.5 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border border-brand-900">
                <td className="border border-brand-900 px-1 py-0.5 text-left text-[9px]">{r.label}</td>
                {REPORT_CARD_MONTHS.map((m) => {
                  const v = byMonth.get(m);
                  return (
                    <td key={m} className="border border-brand-900 px-0.5 py-0.5 text-center">
                      {v ? (v[r.key] || "") : ""}
                    </td>
                  );
                })}
                <td className="border border-brand-900 px-1 py-0.5 text-center font-semibold">
                  {totalKey[r.key] || ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[8px] text-brand-400">
        No. of class days = days with recorded attendance (no school-calendar table available).
      </p>
    </section>
  );
}

function SignatureLines({ count, leftLabel }: { count: number; leftLabel: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex justify-between gap-2 text-[9px]">
          <span className="text-brand-500">
            {leftLabel} {i + 1}
          </span>
          <span className="min-w-[70%] border-b border-brand-400" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ schoolYear }: { schoolYear: string }) {
  return (
    <div className="mt-6 border border-dashed border-brand-300 px-4 py-6 text-center text-[10px] text-brand-500">
      No enrollment record found for this learner
      {schoolYear ? ` in School Year ${schoolYear}` : " in the selected school year"}. No academic
      or attendance data is shown until an enrollment exists.
    </div>
  );
}
