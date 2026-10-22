import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Download } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { canAccessStudent } from "@/lib/scope";
import { getForm137Data } from "@/lib/form137";
import { SCHOOL } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { buttonStyles } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/print-button";
import schoolLogo from "../../../../../../../public/logo.png";

export const metadata = { title: "SF9 — Form 137" };

/**
 * SF9 — Learner's Permanent Academic Record (formerly Form 137) preview
 * (Registrar domain). STRICTLY read-only — rendering this document never
 * mutates student data.
 *
 * Visual treatment follows the official DepEd spreadsheet/record style the
 * requester pointed at: landscape sheet, white background, thin black grid
 * lines, dense compact tables, formal serif typography, logo + DepEd
 * letterhead. The SF2-style attendance grid from that reference is
 * deliberately NOT copied — this page shows only academic-record content.
 *
 * This page is the 1:1 screen/print preview of the downloaded PDF
 * (`/api/form137/[id]` → src/lib/reports/form137-pdf.tsx): same section
 * order, same typography, same grid, one dense table per school year of the
 * learner's enrollment history. Fields the system does not store render as
 * blank ruled lines — no values are invented.
 */

const TIMES = '"Times New Roman", Times, serif';

const fmt = (n: number | null | undefined) => (n == null ? "" : String(n));
const orBlank = (s: string | null | undefined) => s ?? "";

/** "Label ______value______" ruled display cell (never a web-form control). */
function InfoField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <span className={`flex grow items-end gap-1.5 border-neutral-900 px-2 py-1 ${className}`}>
      <span className="shrink-0 text-[9px]">{label}</span>
      <span className="flex h-[13px] min-w-0 flex-1 items-center justify-center border-b border-neutral-900 px-1 text-center">
        {value}
      </span>
    </span>
  );
}

const GRADE_COLS = ["w-[31%]", "w-[7.5%]", "w-[7.5%]", "w-[7.5%]", "w-[7.5%]", "w-[11%]", "w-[28%]"];

function YearBlock({
  block,
}: {
  block: NonNullable<Awaited<ReturnType<typeof getForm137Data>>>["blocks"][number];
}) {
  const title = `School Year ${block.schoolYear} — ${block.gradeLevel}${
    block.section ? ` — Section ${block.section}` : ""
  }${block.adviser ? ` (Adviser: ${block.adviser})` : ""}`;
  return (
    <section className="mt-2 break-inside-avoid">
      <p className="border border-neutral-900 border-b-0 px-2 py-0.5 text-center text-[10px] font-bold uppercase">
        {title}
      </p>
      <table className="w-full table-fixed border-collapse text-[9.5px]">
        <colgroup>
          {GRADE_COLS.map((c, i) => (
            <col key={i} className={c} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {["Learning Areas", "1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter", "Final Rating", "Remarks"].map(
              (h, i) => (
                <th key={h} className={`border border-neutral-900 px-1 py-0.5 text-center font-bold ${i === 6 ? "" : "border-r-neutral-900"}`}>
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {block.subjects.length === 0 ? (
            <tr>
              <td colSpan={7} className="border border-neutral-900 px-2 py-1.5 text-center text-neutral-600">
                No grades recorded for this school year yet.
              </td>
            </tr>
          ) : (
            <>
              {block.subjects.map((s) => (
                <tr key={s.subjectCode} className="break-inside-avoid">
                  <td className="border border-neutral-900 px-1.5 py-0.5 text-left">{s.subjectName}</td>
                  {s.quarters.map((g, i) => (
                    <td key={i} className="border border-neutral-900 px-1 py-0.5 text-center">
                      {fmt(g)}
                    </td>
                  ))}
                  <td className="border border-neutral-900 px-1 py-0.5 text-center font-semibold">
                    {fmt(s.finalGrade)}
                  </td>
                  <td className="border border-neutral-900 px-1 py-0.5 text-center">
                    {orBlank(s.remark)}
                  </td>
                </tr>
              ))}
              <tr className="break-inside-avoid font-semibold">
                <td className="border border-neutral-900 px-1.5 py-0.5 text-left">General Average</td>
                <td className="border border-neutral-900" />
                <td className="border border-neutral-900" />
                <td className="border border-neutral-900" />
                <td className="border border-neutral-900" />
                <td className="border border-neutral-900 px-1 py-0.5 text-center">
                  {fmt(block.generalAverage)}
                </td>
                <td className="border border-neutral-900" />
              </tr>
            </>
          )}
        </tbody>
      </table>
    </section>
  );
}

function SignatureBlock({ name, role }: { name: string; role: string }) {
  return (
    <div className="w-[30%] text-center">
      <p className="text-[10px] font-semibold">{name || "\u00a0"}</p>
      <p className="mx-auto border-t border-neutral-400 pt-0.5 text-[8.5px]">{role}</p>
    </div>
  );
}

export default async function Form137Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "documents.print")) redirect("/students");

  const { id } = await params;
  if (!(await canAccessStudent(user, { studentId: id }))) redirect("/students");

  const data = await getForm137Data(id);
  if (!data) redirect("/students");

  const sex = data.student.sex
    ? data.student.sex.charAt(0).toUpperCase() + data.student.sex.slice(1)
    : "";

  return (
    <div className="space-y-5 print:space-y-0">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#64748B] print:hidden">
        <Link href="/students" className="font-medium hover:text-brand-900">
          Registry
        </Link>
        <ChevronRight aria-hidden="true" className="h-3 w-3 text-brand-300" />
        <Link href={`/students/${data.student.id}`} className="font-medium hover:text-brand-900">
          {data.student.studentNumber}
        </Link>
        <ChevronRight aria-hidden="true" className="h-3 w-3 text-brand-300" />
        <span className="font-medium text-brand-900">Form 137 (SF9)</span>
      </nav>

      <div className="flex justify-end gap-2 print:hidden">
        <a href={`/api/form137/${id}`} className={buttonStyles("outline", "sm")}>
          <Download aria-hidden="true" className="h-3.5 w-3.5" />
          Download PDF
        </a>
        <PrintButton label="Preview & Print" />
      </div>

      {/* Landscape A4 sheet — 1:1 preview of the printed artifact */}
      <div
        className="mx-auto rounded-lg border border-brand-200 bg-white shadow-sm print:max-w-none print:rounded-none print:border-none print:shadow-none"
        style={{ width: "297mm", maxWidth: "100%" }}
      >
        <div
          className="px-[10mm] pb-[12mm] pt-[8mm] text-[9.5px] leading-snug text-neutral-900"
          style={{ fontFamily: TIMES }}
        >
          {/* Official letterhead — school seal + DepEd hierarchy */}
          <header className="flex items-start">
            <Image
              src={schoolLogo}
              alt="School seal"
              width={56}
              height={38}
              className="mr-1.5 shrink-0"
              style={{ width: 56, height: 38, objectFit: "contain" }}
            />
            <div className="min-w-0 flex-1 text-center leading-tight">
              <p>Republic of the Philippines</p>
              <p>Department of Education</p>
              <p>Region V</p>
              <p>SCHOOLS DIVISION OF SORSOGON</p>
              <p className="text-[10px] font-bold">{SCHOOL.name.toUpperCase()}</p>
              <p>{SCHOOL.address}</p>
            </div>
          </header>

          {/* Document title */}
          <div className="mt-1 text-center">
            <h1 className="text-[11.5px] font-bold">LEARNER&apos;S PERMANENT ACADEMIC RECORD</h1>
            <p className="text-[9px]">(SF9 — formerly Form 137)</p>
          </div>

          {/* Learner information — ruled fields in a bordered grid */}
          <section className="mt-1.5 border border-neutral-900">
            <div className="flex border-b border-neutral-900">
              <InfoField label="Name" value={data.student.name} className="border-r border-neutral-900" />
              <InfoField label="LRN" value={orBlank(data.student.lrn)} className="border-r border-neutral-900" />
              <InfoField label="Sex" value={sex} />
            </div>
            <div className="flex">
              <InfoField
                label="Birth Date"
                value={data.student.birthDate ? formatDate(data.student.birthDate) : ""}
                className="border-r border-neutral-900"
              />
              <InfoField label="Age" value={fmt(data.student.age)} className="border-r border-neutral-900" />
              <InfoField label="Student No." value={data.student.studentNumber} />
            </div>
          </section>

          {/* Permanent academic record — one dense table per school year */}
          {data.blocks.length === 0 ? (
            <p className="mt-4 border border-neutral-900 px-3 py-3 text-center">
              No academic records found for this learner yet.
            </p>
          ) : (
            data.blocks.map((block) => <YearBlock key={block.enrollmentId} block={block} />)
          )}

          {/* Certification + signatures (values from the database) */}
          {data.blocks.length > 0 ? (
            <>
              <p className="mt-3 text-[10px]">
                I certify that the above is a true and correct record of the academic performance of
                the learner named in this document.
              </p>
              <div className="mt-10 flex justify-between">
                <SignatureBlock
                  name={data.blocks[data.blocks.length - 1]?.adviser ?? ""}
                  role="Adviser"
                />
                <SignatureBlock name={data.principal ?? ""} role="Secondary School Principal III" />
                <SignatureBlock name="" role="Registrar" />
              </div>
            </>
          ) : null}

          <p className="mt-5 text-center text-[9px] text-brand-400 print:hidden">
            Generated by {user.firstName} {user.lastName} ({user.role}) — read-only document; no
            student data is modified.
          </p>
        </div>
      </div>
    </div>
  );
}
