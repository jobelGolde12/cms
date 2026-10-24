import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Download } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { canAccessStudent } from "@/lib/scope";
import { getForm137Data, type Form137Data } from "@/lib/form137";
import { SCHOOL } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { buttonStyles } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/print-button";
import schoolLogo from "../../../../../../../public/logo.png";

export const metadata = { title: "SF10-JHS — Form 137" };

/**
 * SF10-JHS — Learner's Permanent Academic Record for Junior High School
 * (formerly Form 137) preview (Registrar domain). STRICTLY read-only —
 * rendering this document never mutates student data.
 *
 * Structure follows the official DepEd SF10-JHS template as issued through
 * DepEd Order No. 58, s. 2017 (and preparation guidelines):
 *   1. Government + school letterhead.
 *   2. Learner's personal information (LRN; last name, first name, name
 *      extension, middle name — PSA order; sex; birthdate).
 *   3. Eligibility for Junior High School Enrollment (credential presented,
 *      previous elementary school, general average, distinctions).
 *   4. Scholastic record — one bordered table per school year with school
 *      name / school ID / division / region / SY / grade level / section /
 *      adviser header rows, learning areas sorted as stored, quarterly
 *      ratings, final rating, remarks, general average and the recorded
 *      year-end action.
 *   5. Remedial-classes block (ruled, blank — the schema does not store
 *      remedial marks yet; documented gap, never fabricated).
 *   6. Certification block signed by the School Head with a dry-seal space.
 *
 * Fields the system does not store render as blank ruled fields — no values
 * are invented. This page is the 1:1 screen/print preview of the downloaded
 * PDF (`/api/form137/[id]` → src/lib/reports/form137-pdf.tsx): same
 * sections, same typography, same data. Portrait A4, matching the official
 * form's portrait orientation (printed on bond paper in practice).
 */

const TIMES = '"Times New Roman", Times, serif';
const DIVISION = "Schools Division of Sorsogon";
const REGION = "Region V";

const fmt = (n: number | null | undefined) => (n == null ? "" : String(n));
const orBlank = (s: string | null | undefined) => s ?? "";

/** "Label ______value______" ruled display cell (never a web-form control). */
function InfoField({
  label,
  value,
  bold = false,
  className = "",
}: {
  label: string;
  value: string;
  bold?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`flex grow items-end gap-1.5 border-neutral-900 px-2 py-1 ${className}`}
    >
      <span className="shrink-0 text-[9px]">{label}</span>
      <span
        className={`flex h-[13px] min-w-0 flex-1 items-center justify-center border-b border-neutral-900 px-1 text-center ${
          bold ? "font-semibold" : ""
        }`}
      >
        {value}
      </span>
    </span>
  );
}

/** Labeled empty ruled sub-field (e.g. School ID on the scholastic header). */
function BlankField({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`flex grow items-end gap-1.5 border-neutral-900 px-2 py-1 ${className}`}
    >
      <span className="shrink-0 text-[9px]">{label}</span>
      <span className="h-[13px] min-w-0 flex-1 border-b border-neutral-900" />
    </span>
  );
}

/* Scholastic-record column widths (portrait): areas / Q1..Q4 / final / remarks */
const GRADE_COLS = [
  "w-[28%]",
  "w-[8.5%]",
  "w-[8.5%]",
  "w-[8.5%]",
  "w-[8.5%]",
  "w-[9.5%]",
  "w-[28.5%]",
];

function ScholasticRecordBlock({
  block,
}: {
  block: Form137Data["blocks"][number];
}) {
  return (
    <section className="mt-2 break-inside-avoid">
      {/* Official scholastic-record header rows (school identity + context) */}
      <div className="flex border border-neutral-900 border-b-0">
        <span className="flex grow items-end gap-1.5 border-r border-neutral-900 px-2 py-1">
          <span className="shrink-0 text-[9px]">School:</span>
          <span className="flex h-[13px] min-w-0 flex-1 items-center justify-center border-b border-neutral-900 px-1 text-center font-semibold">
            {SCHOOL.name}
          </span>
        </span>
        <BlankField label="School ID:" className="w-[30%]" />
      </div>
      <div className="flex border-neutral-900">
        <BlankField label="District:" className="w-[30%] border-r" />
        <InfoField
          label="Division:"
          value={DIVISION}
          className="w-[40%] border-r"
        />
        <InfoField label="Region:" value={REGION} className="w-[30%]" />
      </div>
      <div className="flex border border-neutral-900 border-y-0 border-b-0">
        <InfoField
          label="School Year"
          value={block.schoolYear}
          className="w-[20%] border-r"
        />
        <InfoField
          label="Grade Level"
          value={block.gradeLevel}
          className="w-[22%] border-r"
        />
        <InfoField
          label="Section"
          value={orBlank(block.section)}
          className="w-[28%] border-r"
        />
        <InfoField
          label="Adviser"
          value={orBlank(block.adviser)}
          className="w-[30%]"
        />
      </div>

      <table className="w-full table-fixed border-collapse text-[9.5px]">
        <colgroup>
          {GRADE_COLS.map((c, i) => (
            <col key={i} className={c} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {[
              "Learning Areas",
              "1st Quarter",
              "2nd Quarter",
              "3rd Quarter",
              "4th Quarter",
              "Final Rating",
              "Remarks",
            ].map((h, i) => (
              <th
                key={h}
                className={`border border-neutral-900 px-1 py-0.5 text-center font-bold ${i === 6 ? "" : "border-r-neutral-900"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.subjects.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="border border-neutral-900 px-2 py-1.5 text-center text-neutral-600"
              >
                No grades recorded for this school year yet.
              </td>
            </tr>
          ) : (
            <>
              {block.subjects.map((s) => (
                <tr key={s.subjectCode} className="break-inside-avoid">
                  <td className="border border-neutral-900 px-1.5 py-0.5 text-left">
                    {s.subjectName}
                  </td>
                  {s.quarters.map((g, i) => (
                    <td
                      key={i}
                      className="border border-neutral-900 px-1 py-0.5 text-center"
                    >
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
                <td className="border border-neutral-900 px-1.5 py-0.5 text-left">
                  General Average
                </td>
                <td className="border border-neutral-900" />
                <td className="border border-neutral-900" />
                <td className="border border-neutral-900" />
                <td className="border border-neutral-900" />
                <td className="border border-neutral-900 px-1 py-0.5 text-center">
                  {fmt(block.generalAverage)}
                </td>
                <td className="border border-neutral-900" />
              </tr>
              <tr className="break-inside-avoid">
                <td
                  colSpan={5}
                  className="border border-neutral-900 px-1.5 py-0.5 text-right font-semibold"
                >
                  Year-End Action
                </td>
                <td
                  colSpan={2}
                  className="border border-neutral-900 px-1 py-0.5 text-center font-semibold uppercase"
                >
                  {block.promotionStatus
                    ? block.promotionStatus.toUpperCase()
                    : ""}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </section>
  );
}

/** Blank ruled Remedial-Classes block (official form section; data gap). */
function RemedialBlock() {
  return (
    <section className="mt-3 break-inside-avoid">
      <p className="border border-neutral-900 border-b-0 px-2 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide">
        Remedial Classes — Completed and Recomputed Final Grades
      </p>
      <table className="w-full table-fixed border-collapse text-[9px]">
        <colgroup>
          <col className="w-[24%]" />
          <col className="w-[14%]" />
          <col className="w-[18%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[16%]" />
        </colgroup>
        <thead>
          <tr>
            {[
              "Learning Area",
              "Final Rating",
              "Dates of Remedial Class",
              "Remedial Class Mark",
              "Recomputed Final Grade",
              "Remarks",
            ].map((h, i) => (
              <th
                key={h}
                className={`border border-neutral-900 px-1 py-0.5 text-center font-bold ${i === 5 ? "" : "border-r-neutral-900"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[0, 1].map((r) => (
            <tr key={r}>
              {Array.from({ length: 6 }).map((_, i) => (
                <td
                  key={i}
                  className={`h-[13px] border border-neutral-900 ${i === 5 ? "" : "border-r"}`}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SignatureBlock({ name, role }: { name: string; role: string }) {
  return (
    <div className="w-[38%] text-center">
      <p className="text-[10px] font-semibold">{name || "\u00a0"}</p>
      <p className="mx-auto border-t border-neutral-400 pt-0.5 text-[8.5px]">
        {role}
      </p>
    </div>
  );
}

/** "Grade 9" → "Grade 10" (null when not promotable/unknown). */
function nextGradeLevel(gradeLevel: string | undefined): string | null {
  const m = gradeLevel?.match(/^grade\s+(\d+)$/i);
  return m && Number(m[1]) < 12 ? `Grade ${Number(m[1]) + 1}` : null;
}

export default async function Form137Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  const lastBlock = data.blocks[data.blocks.length - 1];
  const eligibleNext = lastBlock?.promotionStatus
    ?.toLowerCase()
    .includes("promoted")
    ? nextGradeLevel(lastBlock.gradeLevel)
    : null;

  return (
    <div className="space-y-5 print:space-y-0">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs text-[#64748B] print:hidden"
      >
        <Link href="/students" className="font-medium hover:text-brand-900">
          Registry
        </Link>
        <ChevronRight aria-hidden="true" className="h-3 w-3 text-brand-300" />
        <Link
          href={`/students/${data.student.id}`}
          className="font-medium hover:text-brand-900"
        >
          {data.student.studentNumber}
        </Link>
        <ChevronRight aria-hidden="true" className="h-3 w-3 text-brand-300" />
        <span className="font-medium text-brand-900">Form 137 (SF10-JHS)</span>
      </nav>

      <div className="flex justify-end gap-2 print:hidden">
        <a
          href={`/api/form137/${id}`}
          className={buttonStyles("outline", "sm")}
        >
          <Download aria-hidden="true" className="h-3.5 w-3.5" />
          Download PDF
        </a>
        <PrintButton label="Preview & Print" />
      </div>

      <p className="mx-auto max-w-[210mm] border border-brand-200 bg-brand-50 px-3 py-1.5 text-center text-[11px] text-brand-900 print:hidden">
        System-generated preview of the Learners Permanent Academic Record —
        this screen copy is NOT an official certified document. An SF10 copy
        becomes valid only when signed in ink by the School Head and stamped
        with the school dry seal.
      </p>

      {/* Portrait sheet — 1:1 preview of the printed artifact */}
      <div
        className="mx-auto rounded-lg border border-brand-200 bg-white shadow-sm print:max-w-none print:rounded-none print:border-none print:shadow-none"
        style={{ width: "210mm", maxWidth: "100%" }}
      >
        <div
          className="px-[12mm] pb-[10mm] pt-[8mm] text-[9.5px] leading-snug text-neutral-900"
          style={{ fontFamily: TIMES }}
        >
          {/* Official letterhead — school seal + DepEd hierarchy */}
          <header className="flex items-start">
            <Image
              src={schoolLogo}
              alt="School seal"
              width={52}
              height={52}
              className="mr-2 shrink-0"
              style={{ width: 52, height: 52, objectFit: "contain" }}
            />
            <div className="min-w-0 flex-1 text-center leading-tight">
              <p>Republic of the Philippines</p>
              <p>Department of Education</p>
              <p>{REGION}</p>
              <p className="text-[10px] font-semibold">{DIVISION}</p>
              <p className="mt-0.5 text-[11.5px] font-bold">
                {SCHOOL.name.toUpperCase()}
              </p>
              <p>{SCHOOL.address}</p>
            </div>
            <span aria-hidden="true" className="w-[52px] shrink-0" />
          </header>

          <div className="my-1.5 border-t border-neutral-900" />

          {/* Document title — official SF10-JHS designation */}
          <div className="text-center">
            <h1 className="text-[12px] font-bold tracking-wide">
              LEARNER&apos;S PERMANENT ACADEMIC RECORD FOR JUNIOR HIGH SCHOOL
            </h1>
            <p className="text-[9.5px]">(formerly FORM 137)</p>
          </div>

          {/* Learner's personal information */}
          <section className="mt-3 flex items-stretch border border-neutral-900">
            <InfoField
              label="Learner Reference Number (LRN)"
              value={orBlank(data.student.lrn)}
              className="w-[36%] border-r"
            />
            <span
              className="flex grow items-end gap-1 border-r border-neutral-900 px-2 py-1"
              title={data.student.name}
            >
              <span className="shrink-0 text-[9px]">
                Name: (Last, First, Middle)
              </span>
              <span className="h-[13px] min-w-0 flex-1">
                <span className="flex h-full items-center justify-center border-b border-neutral-900 px-1 text-center font-semibold">
                  {data.student.name}
                </span>
              </span>
            </span>
          </section>
          <section className="flex border border-neutral-900 border-t-0">
            <InfoField
              label="Last Name"
              value={data.student.lastName}
              className="border-r"
            />
            <InfoField
              label="First Name"
              value={data.student.firstName}
              className="border-r"
            />
            <InfoField
              label="Name Extension"
              value={orBlank(data.student.suffix)}
              className="w-[13%] border-r"
            />
            <InfoField
              label="Middle Name"
              value={orBlank(data.student.middleName)}
              className="w-[17%]"
            />
          </section>
          <section className="flex border border-neutral-900 border-t-0">
            <InfoField label="Sex" value={sex} className="w-[10%] border-r" />
            <InfoField
              label="Birthdate"
              value={
                data.student.birthDate ? formatDate(data.student.birthDate) : ""
              }
              className="w-[16%] border-r"
            />
            <InfoField
              label="Age"
              value={fmt(data.student.age)}
              className="w-[8%] border-r"
            />
            <InfoField
              label="Birth Place"
              value={orBlank(data.student.birthPlace)}
              className="border-r"
            />
            <InfoField
              label="Student No."
              value={data.student.studentNumber}
              className="w-[16%]"
            />
          </section>

          {/* Eligibility for Junior High School Enrollment */}
          <section className="mt-2 border border-neutral-900">
            <p className="border-b border-neutral-900 bg-neutral-50 px-2 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide">
              Eligibility for Junior High School Enrollment
            </p>
            <div className="flex border-b border-neutral-900">
              <InfoField
                label="Certificate / Credential"
                value={orBlank(data.eligibility?.certificate)}
                className="w-[32%] border-r"
              />
              <InfoField
                label="Name of School (previous)"
                value={orBlank(data.eligibility?.previousSchoolName)}
                className="border-r"
              />
              <BlankField label="School ID:" className="w-[13%] border-r" />
              <InfoField
                label="Grade Level"
                value={orBlank(data.eligibility?.previousGradeLevel)}
                className="w-[12%]"
              />
            </div>
            <div className="flex border-b border-neutral-900">
              <InfoField
                label="Address"
                value={orBlank(data.eligibility?.previousSchoolAddress)}
                className="w-[40%] border-r"
              />
              <InfoField
                label="General Average"
                value={
                  data.eligibility?.previousGeneralAverage
                    ? fmt(data.eligibility.previousGeneralAverage)
                    : ""
                }
                className="w-[15%] border-r"
              />
              <InfoField
                label="Promotion Status"
                value={orBlank(data.eligibility?.promotionStatus)}
                className="w-[20%] border-r"
              />
              <InfoField
                label="Honors / Distinction"
                value={orBlank(data.eligibility?.academicDistinction)}
                className="w-[25%]"
              />
            </div>
          </section>

          {/* Scholastic record — one bordered table per school year */}
          {data.blocks.length === 0 ? (
            <p className="mt-3 border border-neutral-900 px-3 py-3 text-center">
              No academic records found for this learner yet.
            </p>
          ) : (
            <>
              <p className="mt-2 text-center text-[9.5px] font-bold uppercase tracking-wide">
                Scholastic Record
              </p>
              {data.blocks.map((block) => (
                <ScholasticRecordBlock key={block.enrollmentId} block={block} />
              ))}
              <RemedialBlock />
            </>
          )}

          {/* Certification + School Head signature (values from the database) */}
          {data.blocks.length > 0 ? (
            <>
              <div className="mt-4 border border-neutral-900 px-2 pt-1 pb-3">
                <p className="pb-1 text-center text-[9.5px] font-bold uppercase tracking-wide">
                  Certification
                </p>
                <p className="text-[10px] leading-relaxed">
                  I CERTIFY that this is a true record of{" "}
                  <span className="font-semibold">{data.student.name}</span>{" "}
                  with LRN{" "}
                  <span className="font-semibold">
                    {orBlank(data.student.lrn) ||
                      "\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0"}
                  </span>{" "}
                  and that he/she is eligible for admission to{" "}
                  <span className="font-semibold">
                    {eligibleNext ?? "\u00a0\u00a0Grade\u00a0\u00a0"}
                  </span>
                  . Last school year attended:{" "}
                  <span className="font-semibold">
                    {lastBlock?.schoolYear ?? ""}
                  </span>
                  .
                </p>
                <div className="mt-1 flex">
                  <InfoField
                    label="School"
                    value={SCHOOL.name}
                    className="border-r"
                  />
                  <BlankField label="School ID:" className="w-[20%] border-r" />
                  <BlankField label="Date:" className="w-[24%]" />
                </div>
                <div className="mt-8 flex items-start justify-between">
                  <SignatureBlock
                    name={data.principal ?? ""}
                    role="School Head over printed name"
                  />
                  <div className="w-[30%] border border-dashed border-neutral-400 px-2 py-3 text-center text-[8px] text-neutral-600">
                    (Affix School Dry Seal here)
                  </div>
                </div>
              </div>

              {/* Authentication rule printed on the official form */}
              <p className="mt-2 text-center text-[8px] text-neutral-700">
                This copy is system-generated. Valid for all legal purposes only
                when it bears the original signature in ink of the School Head
                and the school dry seal (DepEd Order No. 54, s. 2016).
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
