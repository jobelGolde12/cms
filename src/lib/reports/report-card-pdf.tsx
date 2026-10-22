import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { REPORT_CARD_MONTHS, type ReportCardData } from "@/lib/report-card";
import { SCHOOL } from "@/lib/constants";

/**
 * Server-side PDF rendering for the Learner's Performance Report,
 * using the same stack as `src/lib/reports/pdf.tsx` (@react-pdf/renderer —
 * already a project dependency, works in Node/serverless, no native deps).
 *
 * Visual source of truth is the official CARD.docx template at the project
 * root (and its rendered screenshot): DepEd letterhead with the school seal,
 * ruled learner-information fields, a "Dear Parents" note, the grouped
 * Learning Progress and Achievement table (Learning Areas | TERM 1/2/3 |
 * Final Grade | Remarks), the grading scale, the attendance record,
 * teacher/parent signature areas and the transfer certificate.
 *
 * Every displayed value comes from `ReportCardData` (database-derived via
 * `src/lib/report-card.ts`) — nothing about the learner is hardcoded. Fields
 * the system does not store (track/strand, teacher comments) render as blank
 * ruled lines, exactly like the printed form. Times serif to match the
 * official-document typography. Read-only — renders a buffer only.
 */

const FONT = "Times-Roman";

/** School seal asset (public/logo.png, 1516x1038) at its natural ratio. */
const LOGO_ASPECT = 1516 / 1038;
let logoSrc: string | null = null;
function getLogoSrc(): string | null {
  if (logoSrc !== null) return logoSrc;
  try {
    const file = path.join(process.cwd(), "public", "logo.png");
    logoSrc = fs.readFileSync(file).toString("base64");
  } catch {
    logoSrc = ""; // header renders text-only when the asset cannot be read
  }
  return logoSrc;
}

/** DepEd logo asset (public/deped_logo_kagawaran_ng_edukasyon.jpg). */
let depedLogoSrc: string | null = null;
function getDepEdLogoSrc(): string | null {
  if (depedLogoSrc !== null) return depedLogoSrc;
  try {
    const file = path.join(process.cwd(), "public", "deped_logo_kagawaran_ng_edukasyon.jpg");
    depedLogoSrc = fs.readFileSync(file).toString("base64");
  } catch {
    depedLogoSrc = "";
  }
  return depedLogoSrc;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingBottom: 34,
    paddingHorizontal: 44, // ~15mm
    fontSize: 9.5,
    fontFamily: FONT,
    color: "#111111",
  },
  letterhead: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  logoLeft: { height: 70, width: 70, marginRight: 8 },
  logoRight: { height: 70, width: 70, marginLeft: 8 },
  letterheadText: {
    flex: 1,
    textAlign: "center",
    fontSize: 10.5,
    lineHeight: 1.25,
  },
  schoolName: { fontSize: 11.5, fontWeight: "bold" },
  titleBlock: { marginTop: 8, textAlign: "center" },
  title: { fontSize: 13, fontWeight: "bold", letterSpacing: 0.4 },
  schoolYear: { marginTop: 2, fontSize: 10 },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 9,
  },
  fieldLabel: { fontSize: 10 },
  fieldLine: {
    borderBottom: "0.7pt solid #111111",
    height: 13,
    justifyContent: "center",
  },
  fieldValue: { fontSize: 10, textAlign: "center" },

  intro: { marginTop: 10, fontSize: 9.5, lineHeight: 1.35 },
  salutation: { fontSize: 10.5, marginTop: 10 },

  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: 11,
    marginBottom: 4,
  },
  subSectionTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    marginTop: 12,
  },

  tableRow: { flexDirection: "row", border: "0.6pt solid #111111" },
  th: {
    fontSize: 9,
    fontWeight: "bold",
    paddingVertical: 2.5,
    paddingHorizontal: 3,
    textAlign: "center",
    borderRight: "0.6pt solid #111111",
  },
  td: {
    fontSize: 9,
    paddingVertical: 2,
    paddingHorizontal: 3,
    textAlign: "center",
    borderRight: "0.6pt solid #111111",
  },
  tdLeft: { fontSize: 9, textAlign: "left", paddingVertical: 2, paddingHorizontal: 3, borderRight: "0.6pt solid #111111" },
  lastCol: { borderRight: "none" },
  emptyRow: {
    border: "0.6pt solid #111111",
    padding: 8,
    fontSize: 9,
    color: "#444444",
    textAlign: "center",
  },
  emptyBox: {
    marginTop: 12,
    border: "0.6pt solid #111111",
    padding: 12,
    fontSize: 9.5,
    textAlign: "center",
  },

  certText: { fontSize: 9.5, lineHeight: 1.35 },
  certField: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 8,
  },
  approved: { fontSize: 10, marginTop: 10 },
  sigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  sigName: {
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  sigRole: { fontSize: 8.5, textAlign: "center" },
});

const fmtGrade = (n: number | null | undefined) => (n == null ? "" : String(n));
const orBlank = (s: string | null | undefined) => s ?? "";

/* -------------------------------------------------------------------------- */
/*  Building blocks                                                           */
/* -------------------------------------------------------------------------- */

/** "Label: ______value______" with the value written on the ruled line. */
function FieldValue({
  label,
  value,
  width,
}: {
  label: string;
  value: string;
  width: string;
}) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}: </Text>
      <View style={[styles.fieldLine, { width }]}>
        <Text style={styles.fieldValue}>{value}</Text>
      </View>
    </>
  );
}

const GRADE_COL_WIDTHS = ["36%", "9%", "9%", "9%", "15%", "22%"];

function GradeTableHeader() {
  return (
    <View>
      {/* Grouped header: Learning Areas | TERM (1 2 3) | Final Grade | Remarks */}
      <View style={[styles.tableRow, { borderBottom: "none" }]}>
        <Text style={[styles.th, { width: GRADE_COL_WIDTHS[0], height: 17 }]}>Learning Areas</Text>
        <Text
          style={[
            styles.th,
            {
              width: `${27}%`,
              height: 17,
            },
          ]}
        >
          TERM
        </Text>
        <Text style={[styles.th, { width: GRADE_COL_WIDTHS[4], height: 17 }]}>Final Grade</Text>
        <Text style={[styles.th, { width: GRADE_COL_WIDTHS[5], height: 17, borderRight: "none" }]}>Remarks</Text>
      </View>
      {/* Sub-header row: term numbers under the TERM group */}
      <View style={[styles.tableRow, { borderTop: "none" }]}>
        <Text style={[styles.th, { width: GRADE_COL_WIDTHS[0], fontSize: 8, paddingTop: 0 }]}> </Text>
        {["1", "2", "3"].map((t, i) => (
          <Text
            key={t}
            style={[styles.th, { width: GRADE_COL_WIDTHS[i + 1], fontSize: 8, paddingTop: 0 }]}
          >
            {t}
          </Text>
        ))}
        <Text style={[styles.th, { width: GRADE_COL_WIDTHS[4], fontSize: 8, paddingTop: 0 }]}> </Text>
        <Text style={[styles.th, { width: GRADE_COL_WIDTHS[5], fontSize: 8, paddingTop: 0, borderRight: "none" }]}> </Text>
      </View>
    </View>
  );
}

function GradeTable({
  subjects,
  generalAverage,
}: {
  subjects: ReportCardData["subjects"];
  generalAverage: number | null;
}) {
  return (
    <View>
      <GradeTableHeader />
      {subjects.length === 0 ? (
        <View style={styles.emptyRow}>
          <Text>No grades recorded for this learner yet.</Text>
        </View>
      ) : (
        <>
          {subjects.map((s) => (
            <View key={s.subjectCode} style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdLeft, { width: GRADE_COL_WIDTHS[0] }]}>{s.subjectName}</Text>
              {[s.termGrades[0], s.termGrades[1], s.termGrades[2]].map((g, i) => (
                <Text key={i} style={[styles.td, { width: GRADE_COL_WIDTHS[i + 1] }]}>
                  {fmtGrade(g)}
                </Text>
              ))}
              <Text style={[styles.td, { width: GRADE_COL_WIDTHS[4] }]}>{fmtGrade(s.finalGrade)}</Text>
              <Text style={[styles.td, { width: GRADE_COL_WIDTHS[5] }, styles.lastCol]}>{s.remark ?? ""}</Text>
            </View>
          ))}
          <View style={styles.tableRow} wrap={false}>
            <Text style={[styles.tdLeft, { width: GRADE_COL_WIDTHS[0], fontWeight: "bold" }]}>General Average</Text>
            {[0, 1, 2].map((i) => (
              <Text key={i} style={[styles.td, { width: GRADE_COL_WIDTHS[i + 1] }]} />
            ))}
            <Text style={[styles.td, { width: GRADE_COL_WIDTHS[4], fontWeight: "bold" }]}>{fmtGrade(generalAverage)}</Text>
            <Text style={[styles.td, { width: GRADE_COL_WIDTHS[5] }, styles.lastCol]} />
          </View>
        </>
      )}
    </View>
  );
}

const GRADING_SCALE: [string, string, string][] = [
  ["90-100", "Advancing", "Passed"],
  ["80-89", "Benchmarking", "Passed"],
  ["75-79", "Connecting", "Passed"],
  ["65-74", "Developing", "Failed"],
  ["0-64", "Emerging", "Failed"],
];

function GradingScale() {
  const widths = ["20%", "40%", "40%"];
  return (
    <View>
      <View style={styles.tableRow}>
        {["Grading Scale", "Description", "Remarks"].map((h, i) => (
          <Text key={h} style={[styles.th, { width: widths[i] }, i === 2 ? styles.lastCol : undefined]}>
            {h}
          </Text>
        ))}
      </View>
      {GRADING_SCALE.map(([range, descriptor, remark]) => (
        <View key={range} style={styles.tableRow} wrap={false}>
          <Text style={[styles.td, { width: widths[0] }]}>{range}</Text>
          <Text style={[styles.td, { width: widths[1] }]}>{descriptor}</Text>
          <Text style={[styles.td, styles.lastCol, { width: widths[2] }]}>{remark}</Text>
        </View>
      ))}
    </View>
  );
}

function AttendanceTable({ data }: { data: ReportCardData }) {
  const byKey = new Map(data.attendance.months.map((m) => [m.month, m]));
  const rows: { label: string; key: "schoolDays" | "present" | "absent"; total: number }[] = [
    { label: "No. of Class Days", key: "schoolDays", total: data.attendance.totalSchoolDays },
    { label: "No. of Days Present", key: "present", total: data.attendance.totalPresent },
    { label: "No. of Days Absent", key: "absent", total: data.attendance.totalAbsent },
  ];
  const labelWidth = "18%";
  const monthWidth = `${((82 - 12) / 11).toFixed(2)}%`;
  const totalWidth = "12%";

  return (
    <View>
      <View style={styles.tableRow}>
        <Text style={[styles.th, { width: labelWidth, textAlign: "left", borderRight: "none" }]}>Month</Text>
        {REPORT_CARD_MONTHS.map((m) => (
          <Text key={m} style={[styles.th, { width: monthWidth, borderRight: "none" }]}>
            {m}
          </Text>
        ))}
        <Text style={[styles.th, { width: totalWidth, borderLeft: "0.6pt solid #111111" }]}>Total</Text>
      </View>
      {rows.map((r) => (
        <View key={r.key} style={styles.tableRow} wrap={false}>
          <Text style={[styles.tdLeft, { width: labelWidth, fontSize: 7.5, borderRight: "none" }]}>{r.label}</Text>
          {REPORT_CARD_MONTHS.map((m) => {
            const v = byKey.get(m);
            return (
              <Text key={m} style={[styles.td, { width: monthWidth, borderRight: "none" }]}>
                {v && (v.schoolDays > 0 || v.present > 0 || v.absent > 0) ? fmtGrade(v[r.key]) : ""}
              </Text>
            );
          })}
          <Text style={[styles.td, { width: totalWidth, borderLeft: "0.6pt solid #111111" }]}>{fmtGrade(r.total)}</Text>
        </View>
      ))}
    </View>
  );
}

/** "Term 1 ______  Term 2 ______  Term 3 ______" (blank ruled lines). */
function TermSignatureRow() {
  return (
    <View style={{ flexDirection: "row", marginTop: 4, gap: 14 }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ flex: 1, flexDirection: "row", alignItems: "flex-end" }}>
          <Text style={{ fontSize: 9 }}>Term {i} </Text>
          <View style={[styles.fieldLine, { flex: 1, width: "auto" }]} />
        </View>
      ))}
    </View>
  );
}

function SignatureBlock({
  name,
  role,
  width,
}: {
  name: string;
  role: string;
  width: string;
}) {
  return (
    <View style={{ width, alignItems: "center" }}>
      <Text style={styles.sigName}>{orBlank(name) || "\u00a0"}</Text>
      <Text style={styles.sigRole}>{role}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Document                                                                  */
/* -------------------------------------------------------------------------- */

const reportCardDoc = (data: ReportCardData) => {
  const capitalize = (s: string | null | undefined) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  return (
    <Document title={`Learner's Performance Report — ${data.student.fullName}`}>
      <Page size="A4" style={styles.page}>
        {/* Official letterhead — left DepEd logo, center info, right school logo */}
        <View style={styles.letterhead}>
          {getDepEdLogoSrc() ? (
            <Image src={`data:image/jpeg;base64,${getDepEdLogoSrc()}`} style={styles.logoLeft} />
          ) : null}
          <View style={styles.letterheadText}>
            <Text>Republic of the Philippines</Text>
            <Text>Department of Education</Text>
            <Text>Region V</Text>
            <Text>SCHOOLS DIVISION OF SORSOGON</Text>
            <Text style={styles.schoolName}>{SCHOOL.name.toUpperCase()}</Text>
            <Text>{SCHOOL.address}</Text>
          </View>
          {getLogoSrc() ? (
            <Image src={`data:image/png;base64,${getLogoSrc()}`} style={styles.logoRight} />
          ) : null}
        </View>

        {/* Report title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>LEARNER&apos;S PERFORMANCE REPORT</Text>
          <Text style={styles.schoolYear}>
            School Year {data.schoolYear || "—"}
          </Text>
        </View>

        {/* Learner information — ruled fields (CARD.docx) */}
        <View style={styles.infoRow}>
          <FieldValue label="Name" width="43%" value={data.student.fullName || ""} />
          <FieldValue label="Age" width="9%" value={fmtGrade(data.student.age)} />
          <FieldValue label="Sex" width="12%" value={capitalize(data.student.sex)} />
        </View>
        <View style={styles.infoRow}>
          <FieldValue label="LRN" width="38%" value={orBlank(data.student.lrn)} />
          <FieldValue
            label="Grade & Section"
            width="37%"
            value={
              data.gradeLevel
                ? `${data.gradeLevel}${data.section ? ` - ${data.section}` : ""}`
                : ""
            }
          />
        </View>
        <View style={styles.infoRow}>
          {/* Track/strand is not stored anywhere in the system — ruled blank
              line, as on the printed form (no invented values). */}
          <FieldValue label="Track" width="55%" value="" />
        </View>

        {!data.hasEnrollment ? (
          <View style={styles.emptyBox}>
            <Text>
              No enrollment record found for this learner
              {data.schoolYear ? ` in School Year ${data.schoolYear}` : ""}. No academic or
              attendance data is shown until an enrollment exists.
            </Text>
          </View>
        ) : (
          <>
            {/* Note to parents (CARD.docx wording) */}
            <Text style={styles.salutation}>Dear Parents,</Text>
            <Text style={styles.intro}>
              This Performance Report shows the ability and progress your child has made in the
              different learning areas as well as his/her core values. The school welcomes you
              should you desire to know more about your child&apos;s progress.
            </Text>

            {/* Learning Progress and Achievement */}
            <Text style={styles.sectionTitle}>Learning Progress and Achievement</Text>
            <GradeTable subjects={data.subjects} generalAverage={data.generalAverage} />

            {/* Performance descriptors / grading scale */}
            <Text style={styles.sectionTitle}>Performance Descriptors</Text>
            <GradingScale />

            {/* Attendance record */}
            <Text style={styles.sectionTitle}>Attendance Record</Text>
            <AttendanceTable data={data} />

            {/* Teacher's comments and parent signature (no stored values — ruled lines) */}
            <Text style={styles.subSectionTitle}>TEACHER&apos;S COMMENTS/REMARKS</Text>
            <TermSignatureRow />
            <Text style={styles.subSectionTitle}>PARENTS/GUARDIAN&apos;S SIGNATURE</Text>
            <TermSignatureRow />

            {/* Certificate of transfer — kept together across page breaks */}
            <View wrap={false}>
              <Text style={styles.subSectionTitle}>CERTIFICATE OF TRANSFER</Text>
              <Text style={styles.certText}>
                This is to certify that the above-named learner has satisfactorily completed the
                requirements for the grade level indicated.
              </Text>
              <View style={styles.certField}>
                <FieldValue label="Admitted to Grade" width="34%" value="" />
              </View>
              <View style={styles.certField}>
                <FieldValue label="Eligible for Admission to Grade" width="37%" value="" />
              </View>
              <Text style={styles.approved}>Approved:</Text>
              <View style={styles.sigRow}>
                <SignatureBlock name={data.principal ?? ""} role="Secondary School Principal III" width="45%" />
                <SignatureBlock name={data.adviser ?? ""} role="Adviser" width="45%" />
              </View>
            </View>

            {/* Cancellation of eligibility to transfer — kept together across page breaks */}
            <View wrap={false}>
              <Text style={styles.subSectionTitle}>CANCELLATION OF ELIGIBILITY TO TRANSFER</Text>
              <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 6 }}>
                <FieldValue label="Admitted in" width="28%" value="" />
                <Text style={styles.fieldLabel}>{"    "}</Text>
                <FieldValue label="Date" width="30%" value="" />
              </View>
              <View style={[styles.sigRow, { justifyContent: "flex-start" }]}>
                <SignatureBlock name={data.principal ?? ""} role="Secondary School Principal III" width="45%" />
              </View>
            </View>
          </>
        )}
      </Page>
    </Document>
  );
};

export async function renderReportCardPdf(data: ReportCardData): Promise<Uint8Array> {
  return renderToBuffer(reportCardDoc(data));
}
