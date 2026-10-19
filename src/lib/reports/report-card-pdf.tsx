import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { REPORT_CARD_MONTHS, type ReportCardData } from "@/lib/report-card";
import { SCHOOL } from "@/lib/constants";

/**
 * Server-side PDF rendering for the Learner's Performance Report Card,
 * using the same stack as `src/lib/reports/pdf.tsx` (@react-pdf/renderer —
 * already a project dependency, works in Node/serverless, no native deps).
 *
 * Layout mirrors `src/app/(app)/students/[id]/print/report-card/page.tsx`
 * (which is the CARD.docx reference): A4 portrait, Times-Roman to match the
 * document's serif typography, identical table column ratios, same section
 * order. Read-only — renders a buffer only, never writes to the database.
 */

const FONT = "Times-Roman";

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 34,
    paddingHorizontal: 40, // ~14mm
    fontSize: 8.5,
    fontFamily: FONT,
    color: "#0f172a",
  },
  header: { textAlign: "center" },
  title: { fontSize: 12, fontWeight: "bold", marginTop: 8 },
  schoolYear: { marginTop: 2, fontSize: 9 },
  details: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    fontSize: 8.5,
  },
  detail: { width: "48%", flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  detailLabel: { color: "#475569" },
  detailValue: { borderBottom: "0.5pt solid #94a3b8", minWidth: "55%", textAlign: "right" },
  notice: {
    marginTop: 8,
    fontSize: 7.5,
    color: "#334155",
    textAlign: "center",
    lineHeight: 1.3,
  },
  sectionTitle: { fontSize: 9, fontWeight: "bold", textTransform: "uppercase", marginTop: 12, marginBottom: 3 },
  tableRow: { flexDirection: "row", border: "0.5pt solid #0f172a" },
  tableHeaderRow: { flexDirection: "row", border: "0.5pt solid #0f172a", backgroundColor: "#f1f5f9" },
  th: {
    fontSize: 8,
    fontWeight: "bold",
    padding: 2,
    textAlign: "center",
    borderRight: "0.5pt solid #0f172a",
  },
  td: {
    fontSize: 8,
    padding: 2,
    textAlign: "center",
    borderRight: "0.5pt solid #0f172a",
  },
  tdLeft: { fontSize: 8, padding: 2, textAlign: "left", borderRight: "0.5pt solid #0f172a" },
  lastCol: { borderRight: "none" },
  signatures: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
  },
  sigCol: { width: "48%" },
  sigLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#475569",
    marginBottom: 5,
  },
  sigBlank: { borderTop: "0.5pt solid #94a3b8", width: "70%" },
  certs: { marginTop: 12, borderTop: "0.5pt solid #0f172a", paddingTop: 6 },
  certLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    marginBottom: 4,
  },
  certBlank: { borderTop: "0.5pt solid #94a3b8", width: "55%" },
  names: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    textAlign: "center",
    fontSize: 8.5,
  },
  nameCol: { width: "48%" },
  nameLine: { borderTop: "0.5pt solid #64748b", paddingTop: 2, fontWeight: "bold" },
  nameRole: { fontSize: 7, color: "#64748b" },
  empty: {
    marginTop: 16,
    border: "0.5pt solid #cbd5e1",
    padding: 12,
    fontSize: 8,
    color: "#64748b",
    textAlign: "center",
  },
});

const fmtGrade = (n: number | null | undefined) => (n == null ? "" : String(n));
const orBlank = (s: string | null | undefined) => (s ? s : "\u00a0");

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue}>{orBlank(value)}</Text>
    </View>
  );
}

const GRADE_COL_WIDTHS = ["38%", "9%", "9%", "9%", "16%", "19%"];

function GradeTable({ subjects, generalAverage }: { subjects: ReportCardData["subjects"]; generalAverage: number | null }) {
  const headers = ["Learning Areas", "Term 1", "Term 2", "Term 3", "Final Grade", "Remarks"];
  return (
    <View>
      <View style={styles.tableHeaderRow}>
        {headers.map((h, i) => (
          <Text
            key={h}
            style={[styles.th, { width: GRADE_COL_WIDTHS[i] }, i === headers.length - 1 ? styles.lastCol : undefined]}
          >
            {h}
          </Text>
        ))}
      </View>

      {subjects.length === 0 ? (
        <View style={styles.tableRow}>
          <Text style={[styles.tdLeft, { width: "100%" }]}>No grades recorded for this learner yet.</Text>
        </View>
      ) : (
        <>
          {subjects.map((s) => (
            <View key={s.subjectCode} style={styles.tableRow}>
              <Text style={[styles.tdLeft, { width: GRADE_COL_WIDTHS[0] }]}>{s.subjectName}</Text>
              {[s.termGrades[0], s.termGrades[1], s.termGrades[2]].map((g, i) => (
                <Text key={i} style={[styles.td, { width: GRADE_COL_WIDTHS[i + 1] }]}>
                  {fmtGrade(g)}
                </Text>
              ))}
              <Text style={[styles.td, { width: GRADE_COL_WIDTHS[4] }]}>{fmtGrade(s.finalGrade)}</Text>
              <Text style={[styles.td, { width: GRADE_COL_WIDTHS[5] }, styles.lastCol]}>
                {s.remark ?? ""}
              </Text>
            </View>
          ))}
          <View style={styles.tableRow}>
            <Text style={[styles.tdLeft, { width: GRADE_COL_WIDTHS[0], fontWeight: "bold" }]}>
              General Average
            </Text>
            <Text style={[styles.td, { width: GRADE_COL_WIDTHS[1], fontWeight: "bold" }]}>
              {fmtGrade(generalAverage)}
            </Text>
            <Text style={[styles.td, styles.lastCol, { width: "53%" }]} />
          </View>
        </>
      )}
    </View>
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
    <View>
      <View style={styles.tableHeaderRow}>
        {["Grade Level Range", "Descriptor", "Remarks"].map((h) => (
          <Text key={h} style={[styles.th, { width: "33.33%" }]}>
            {h}
          </Text>
        ))}
      </View>
      {DESCRIPTOR_SCALE.map(([range, descriptor, remark]) => (
        <View key={range} style={styles.tableRow}>
          <Text style={[styles.td, { width: "33.33%" }]}>{range}</Text>
          <Text style={[styles.td, { width: "33.33%" }]}>{descriptor}</Text>
          <Text style={[styles.td, styles.lastCol, { width: "33.33%" }]}>{remark}</Text>
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
  const monthWidth = `${(62 / (REPORT_CARD_MONTHS.length + 1)).toFixed(2)}%`;

  return (
    <View>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.th, { width: "24%", textAlign: "left" }]}>Month</Text>
        {REPORT_CARD_MONTHS.map((m) => (
          <Text key={m} style={[styles.th, { width: monthWidth }]}>
            {m}
          </Text>
        ))}
        <Text style={[styles.th, styles.lastCol, { width: "14%" }]}>Total</Text>
      </View>
      {rows.map((r) => (
        <View key={r.key} style={styles.tableRow}>
          <Text style={[styles.tdLeft, { width: "24%", fontSize: 6.5 }]}>{r.label}</Text>
          {REPORT_CARD_MONTHS.map((m) => {
            const v = byKey.get(m);
            return (
              <Text key={m} style={[styles.td, { width: monthWidth }]}>
                {v ? fmtGrade(v[r.key] as number) : ""}
              </Text>
            );
          })}
          <Text style={[styles.td, styles.lastCol, { width: "14%" }]}>{fmtGrade(r.total)}</Text>
        </View>
      ))}
    </View>
  );
}

const reportCardDoc = (data: ReportCardData) => (
  <Document title={`Learner's Performance Report — ${data.student.fullName}`}>
    <Page size="A4" style={styles.page}>
      {/* Government header (CARD.docx) */}
      <View style={styles.header}>
        <Text>Republic of the Philippines</Text>
        <Text style={{ fontWeight: "bold" }}>DEPARTMENT OF EDUCATION</Text>
        <Text>Region V</Text>
        <Text style={{ fontWeight: "bold" }}>SCHOOLS DIVISION OF SORSOGON</Text>
        <Text style={{ fontWeight: "bold", marginTop: 2 }}>{SCHOOL.name}</Text>
        <Text>{SCHOOL.address}</Text>
        <Text style={styles.title}>LEARNER&apos;S PERFORMANCE REPORT</Text>
        <Text style={styles.schoolYear}>{data.schoolYear ? `School Year ${data.schoolYear}` : "School Year —"}</Text>
      </View>

      {/* Learner details */}
      <View style={styles.details}>
        <Detail label="Name" value={data.student.fullName || "—"} />
        <Detail label="Age" value={fmtGrade(data.student.age)} />
        <Detail label="Sex" value={data.student.sex ? data.student.sex.charAt(0).toUpperCase() + data.student.sex.slice(1) : "—"} />
        {/* No `lrn` column exists (documented gap) — student number is the identifier. */}
        <Detail label="LRN / Student No." value={data.student.studentNumber} />
        <Detail
          label="Grade & Section"
          value={data.gradeLevel ? `${data.gradeLevel}${data.section ? ` — ${data.section}` : ""}` : "—"}
        />
        <Detail label="Track" value="not tracked in the system" />
      </View>

      {!data.hasEnrollment ? (
        <View style={styles.empty}>
          <Text>
            No enrollment record found for this learner
            {data.schoolYear ? ` in School Year ${data.schoolYear}` : ""}. No academic or
            attendance data is shown until an enrollment exists.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.notice}>
            Dear Parents, this report serves as the school&apos;s official record of the
            learner&apos;s comparative progress and achievement in the learning areas and the
            values demonstrated during the grading period(s). This will serve as basis in
            monitoring the learner&apos;s development in school.
          </Text>

          <Text style={styles.sectionTitle}>Learning Progress and Achievement</Text>
          <GradeTable subjects={data.subjects} generalAverage={data.generalAverage} />

          <Text style={styles.sectionTitle}>Learner&apos;s Performance Descriptor</Text>
          <DescriptorScale />

          <Text style={styles.sectionTitle}>Attendance Report</Text>
          <AttendanceTable data={data} />

          <View style={styles.signatures}>
            <View style={styles.sigCol}>
              <Text style={styles.sectionTitle}>Teacher&apos;s Remarks</Text>
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.sigLine}>
                  <Text>Term {i}</Text>
                  <View style={styles.sigBlank} />
                </View>
              ))}
            </View>
            <View style={styles.sigCol}>
              <Text style={styles.sectionTitle}>Parents&apos;/Guardian&apos;s Signature</Text>
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.sigLine}>
                  <Text>Term {i}</Text>
                  <View style={styles.sigBlank} />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.certs}>
            <Text style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: 8.5 }}>
              Certificate of Transfer (if applicable)
            </Text>
            <View style={{ marginTop: 6 }}>
              {["Admitted to Grade", "Eligible for Admission to Grade", "Cancelled — Eligibility to Transfer (Admitted in)", "Date"].map(
                (label) => (
                  <View key={label} style={styles.certLine}>
                    <Text>{label}:</Text>
                    <View style={styles.certBlank} />
                  </View>
                ),
              )}
            </View>
            <View style={styles.names}>
              <View style={styles.nameCol}>
                <Text style={styles.nameLine}>{orBlank(data.adviser)}</Text>
                <Text style={styles.nameRole}>Adviser</Text>
              </View>
              <View style={styles.nameCol}>
                <Text style={styles.nameLine}>{orBlank(data.principal)}</Text>
                <Text style={styles.nameRole}>Principal</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </Page>
  </Document>
);

export async function renderReportCardPdf(data: ReportCardData): Promise<Uint8Array> {
  return renderToBuffer(reportCardDoc(data));
}
