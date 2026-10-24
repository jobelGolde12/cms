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
import type { Form137Data } from "@/lib/form137";
import { SCHOOL } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

/**
 * Server-side PDF rendering for the SF10-JHS — Learner's Permanent Academic
 * Record for Junior High School (formerly Form 137), using the same stack as
 * the report card (@react-pdf/renderer — already a project dependency).
 *
 * This is the 1:1 print twin of the screen preview
 * (src/app/(app)/students/[id]/print/form137/page.tsx): same section order,
 * same typography, same grid, portrait A4, driven by the SAME `Form137Data`
 * (database-derived via `src/lib/form137.ts`) — nothing about the learner is
 * hardcoded. Read-only — renders a buffer only, never writes to the database.
 */

const FONT = "Times-Roman";
const BORDER = "0.6pt solid #111111";
const DIVISION = "Schools Division of Sorsogon";
const REGION = "Region V";

/** School seal asset (public/logo.png, 512x512 PNG) — square, so width = height. */
const LOGO_ASPECT = 1;
let logoSrc: string | null = null;
function getLogoSrc(): string | null {
  if (logoSrc !== null) return logoSrc;
  try {
    logoSrc = fs
      .readFileSync(path.join(process.cwd(), "public", "logo.png"))
      .toString("base64");
  } catch {
    logoSrc = ""; // header renders text-only when the asset cannot be read
  }
  return logoSrc;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 34,
    fontSize: 8.5,
    fontFamily: FONT,
    color: "#111111",
  },
  letterhead: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  logo: {
    height: 48,
    width: 48 * LOGO_ASPECT,
    marginRight: 8,
    objectFit: "contain",
  },
  letterheadText: {
    flex: 1,
    textAlign: "center",
    fontSize: 9.5,
    lineHeight: 1.3,
  },
  schoolName: { fontSize: 11.5, fontWeight: "bold" },
  rule: {
    borderBottomWidth: 0.6,
    borderBottomColor: "#111111",
    marginVertical: 5,
  },
  titleBlock: {
    textAlign: "center",
  },
  title: { fontSize: 11.5, fontWeight: "bold" },
  subtitle: { fontSize: 9 },

  sectionLabel: {
    fontSize: 8.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    textAlign: "center",
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  infoGrid: {
    border: BORDER,
  },
  infoRow: {
    flexDirection: "row",
    borderTop: BORDER,
  },
  infoRowFirst: {
    flexDirection: "row",
    borderTop: "none",
  },
  infoCell: {
    flexDirection: "row",
    alignItems: "flex-end",
    flexGrow: 1,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRight: BORDER,
  },
  infoLabel: { fontSize: 8 },
  infoLine: {
    borderBottom: BORDER,
    flex: 1,
    height: 11,
    justifyContent: "center",
    marginLeft: 3,
  },
  infoValue: { fontSize: 8.5, textAlign: "center" },

  th: {
    fontSize: 8,
    fontWeight: "bold",
    paddingVertical: 2.5,
    paddingHorizontal: 3,
    textAlign: "center",
    borderRight: BORDER,
  },
  tableRow: { flexDirection: "row", border: BORDER, borderTop: "none" },
  td: {
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 3,
    textAlign: "center",
    borderRight: BORDER,
  },
  tdLeft: {
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 3,
    textAlign: "left",
    borderRight: BORDER,
  },
  lastCol: { borderRight: "none" },
  emptyRow: {
    border: BORDER,
    padding: 6,
    fontSize: 8,
    color: "#444444",
    textAlign: "center",
  },

  cert: {
    border: BORDER,
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  sigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 22,
  },
  sigName: { fontSize: 9, fontWeight: "bold", textAlign: "center" },
  sigRole: { fontSize: 7.5, textAlign: "center" },
  sealBox: {
    width: "30%",
    border: "0.6pt dashed #94a3b8",
    paddingVertical: 12,
    paddingHorizontal: 6,
    fontSize: 7.5,
    color: "#444444",
    textAlign: "center",
  },
  printNote: {
    marginTop: 8,
    fontSize: 7,
    color: "#333333",
    textAlign: "center",
    lineHeight: 1.3,
  },
});

const fmt = (n: number | null | undefined) => (n == null ? "" : String(n));
const orBlank = (s: string | null | undefined) => s ?? "";

/* -------------------------------------------------------------------------- */
/*  Building blocks                                                           */
/* -------------------------------------------------------------------------- */

/** "Label ______value______" inside a bordered info cell. */
function InfoField({
  label,
  value,
  flex,
  bold = false,
}: {
  label: string;
  value: string;
  flex: number;
  bold?: boolean;
}) {
  return (
    <View style={[styles.infoCell, { flex }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoLine}>
        <Text
          style={[styles.infoValue, bold ? { fontWeight: "bold" } : undefined]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

/** Labeled empty ruled sub-field (e.g. School ID on the scholastic header). */
function BlankField({ label, flex }: { label: string; flex: number }) {
  return (
    <View style={[styles.infoCell, { flex }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoLine} />
    </View>
  );
}

/* Scholastic-record column widths (portrait): areas / Q1..Q4 / final / remarks */
const GRADE_COL_WIDTHS = [
  "28%",
  "8.5%",
  "8.5%",
  "8.5%",
  "8.5%",
  "9.5%",
  "28.5%",
];

/** One school-year block of the permanent record. */
function ScholasticRecordBlock({
  block,
}: {
  block: Form137Data["blocks"][number];
}) {
  return (
    <View>
      {/* Scholastic-record header rows (school identity + context) */}
      <View style={[styles.infoGrid, { marginTop: 7 }]}>
        <View style={styles.infoRowFirst}>
          <InfoField label="School:" value={SCHOOL.name} flex={7} bold />
          <BlankField label="School ID:" flex={3} />
        </View>
        <View style={styles.infoRow}>
          <BlankField label="District:" flex={3} />
          <InfoField label="Division:" value={DIVISION} flex={4} />
          <InfoField label="Region:" value={REGION} flex={3} />
        </View>
        <View style={styles.infoRow}>
          <InfoField label="School Year" value={block.schoolYear} flex={2} />
          <InfoField label="Grade Level" value={block.gradeLevel} flex={2} />
          <InfoField label="Section" value={orBlank(block.section)} flex={3} />
          <InfoField label="Adviser" value={orBlank(block.adviser)} flex={3} />
        </View>
      </View>
      {/* Learning-area ratings table */}
      <View style={styles.tableRow}>
        {[
          "Learning Areas",
          "1st Quarter",
          "2nd Quarter",
          "3rd Quarter",
          "4th Quarter",
          "Final Rating",
          "Remarks",
        ].map((h, i) => (
          <Text
            key={h}
            style={[
              styles.th,
              { width: GRADE_COL_WIDTHS[i] },
              i >= 1 && i <= 4
                ? { borderRight: "none", borderLeft: BORDER }
                : undefined,
              i === 6 ? styles.lastCol : undefined,
            ]}
          >
            {h}
          </Text>
        ))}
      </View>
      {block.subjects.length === 0 ? (
        <View style={[styles.emptyRow, { borderTop: "none" }]}>
          <Text>No grades recorded for this school year yet.</Text>
        </View>
      ) : (
        <>
          {block.subjects.map((s) => (
            <View key={s.subjectCode} style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdLeft, { width: GRADE_COL_WIDTHS[0] }]}>
                {s.subjectName}
              </Text>
              {s.quarters.map((g, i) => (
                <Text
                  key={i}
                  style={[
                    styles.td,
                    { width: GRADE_COL_WIDTHS[i + 1] },
                    i < 3 ? { borderLeft: BORDER } : undefined,
                  ]}
                >
                  {fmt(g)}
                </Text>
              ))}
              <Text
                style={[
                  styles.td,
                  styles.lastCol,
                  { width: GRADE_COL_WIDTHS[5], fontWeight: "bold" },
                  { borderLeft: BORDER },
                ]}
              >
                {fmt(s.finalGrade)}
              </Text>
              <Text
                style={[
                  styles.td,
                  styles.lastCol,
                  { width: GRADE_COL_WIDTHS[6], borderLeft: BORDER },
                ]}
              >
                {orBlank(s.remark)}
              </Text>
            </View>
          ))}
          <View style={styles.tableRow} wrap={false}>
            <Text
              style={[
                styles.tdLeft,
                { width: GRADE_COL_WIDTHS[0], fontWeight: "bold" },
              ]}
            >
              General Average
            </Text>
            {[0, 1, 2, 3].map((i) => (
              <Text
                key={i}
                style={[
                  styles.td,
                  { width: GRADE_COL_WIDTHS[i + 1] },
                  i < 3 ? { borderLeft: BORDER } : undefined,
                ]}
              />
            ))}
            <Text
              style={[
                styles.td,
                styles.lastCol,
                {
                  width: GRADE_COL_WIDTHS[5],
                  fontWeight: "bold",
                  borderLeft: BORDER,
                },
              ]}
            >
              {fmt(block.generalAverage)}
            </Text>
            <Text
              style={[
                styles.td,
                styles.lastCol,
                { width: GRADE_COL_WIDTHS[6], borderLeft: BORDER },
              ]}
            />
          </View>
          <View style={styles.tableRow} wrap={false}>
            <Text
              style={[
                styles.tdLeft,
                { width: "49.5%", fontWeight: "bold", textAlign: "right" },
              ]}
            >
              Year-End Action
            </Text>
            <Text
              style={[
                styles.td,
                styles.lastCol,
                { width: "50.5%", borderLeft: BORDER, fontWeight: "bold" },
              ]}
            >
              {block.promotionStatus ? block.promotionStatus.toUpperCase() : ""}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

/** Blank ruled Remedial-Classes block (official form section; data gap). */
function RemedialBlock() {
  const widths = ["24%", "14%", "18%", "14%", "14%", "16%"];
  const headers = [
    "Learning Area",
    "Final Rating",
    "Dates of Remedial Class",
    "Remedial Class Mark",
    "Recomputed Final Grade",
    "Remarks",
  ];
  return (
    <View>
      <View
        style={[
          styles.infoGrid,
          styles.infoRowFirst,
          {
            borderBottom: "none",
            borderRight: "none",
            borderLeft: "none",
            marginTop: 10,
          },
        ]}
      >
        <Text style={styles.sectionLabel}>
          Remedial Classes — Completed and Recomputed Final Grades
        </Text>
      </View>
      <View style={styles.tableRow}>
        {headers.map((h, i) => (
          <Text
            key={h}
            style={[
              styles.th,
              { width: widths[i] },
              i >= 1 && i <= 4
                ? { borderRight: "none", borderLeft: BORDER }
                : undefined,
              i === 5 ? styles.lastCol : undefined,
            ]}
          >
            {h}
          </Text>
        ))}
      </View>
      {[0, 1].map((r) => (
        <View key={r} style={styles.tableRow} wrap={false}>
          {widths.map((w, i) => (
            <Text
              key={i}
              style={[
                styles.td,
                { width: w, height: 13 },
                i >= 1 && i <= 4
                  ? { borderRight: "none", borderLeft: BORDER }
                  : undefined,
                i === 5 ? styles.lastCol : undefined,
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function SignatureBlock({ name, role }: { name: string; role: string }) {
  return (
    <View style={{ width: "38%", alignItems: "center" }}>
      <Text style={styles.sigName}>{orBlank(name) || "\u00a0"}</Text>
      <Text
        style={[
          styles.sigRole,
          {
            borderTop: "0.6pt solid #94a3b8",
            paddingTop: 2,
            alignSelf: "stretch",
          },
        ]}
      >
        {role}
      </Text>
    </View>
  );
}

/** "Grade 9" → "Grade 10" (null when not promotable/unknown). */
function nextGradeLevel(gradeLevel: string | undefined): string | null {
  const m = gradeLevel?.match(/^grade\s+(\d+)$/i);
  return m && Number(m[1]) < 12 ? `Grade ${Number(m[1]) + 1}` : null;
}

/* -------------------------------------------------------------------------- */
/*  Document                                                                  */
/* -------------------------------------------------------------------------- */

const form137Doc = (data: Form137Data) => {
  const logo = getLogoSrc();
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
    <Document
      title={`SF10-JHS — Learner's Permanent Academic Record — ${data.student.name}`}
    >
      <Page size="A4" style={styles.page}>
        {/* Official letterhead — school seal + DepEd hierarchy */}
        <View style={styles.letterhead}>
          {logo ? (
            // @react-pdf's Image is not an HTML <img>; the jsx-a11y/alt-text
            // rule does not apply (ImageProps has no alt prop at all).
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={`data:image/png;base64,${logo}`} style={styles.logo} />
          ) : null}
          <View style={styles.letterheadText}>
            <Text>Republic of the Philippines</Text>
            <Text>Department of Education</Text>
            <Text>{REGION}</Text>
            <Text style={{ fontSize: 10, fontWeight: "bold" }}>{DIVISION}</Text>
            <Text style={styles.schoolName}>{SCHOOL.name.toUpperCase()}</Text>
            <Text>{SCHOOL.address}</Text>
          </View>
          <View style={{ width: 48 }} />
        </View>

        <View style={styles.rule} />

        {/* Document title — official SF10-JHS designation */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>
            LEARNER&apos;S PERMANENT ACADEMIC RECORD FOR JUNIOR HIGH SCHOOL
          </Text>
          <Text style={styles.subtitle}>(formerly FORM 137)</Text>
        </View>

        {/* Learner's personal information */}
        <View style={[styles.infoGrid, { marginTop: 7 }]}>
          <View style={styles.infoRowFirst}>
            <InfoField label="LRN" value={orBlank(data.student.lrn)} flex={4} />
            <InfoField
              label="Name (Last, First, Middle)"
              value={data.student.name}
              flex={6}
              bold
            />
          </View>
          <View style={styles.infoRow}>
            <InfoField
              label="Last Name"
              value={data.student.lastName}
              flex={3}
            />
            <InfoField
              label="First Name"
              value={data.student.firstName}
              flex={3}
            />
            <InfoField
              label="Name Extension"
              value={orBlank(data.student.suffix)}
              flex={1.5}
            />
            <InfoField
              label="Middle Name"
              value={orBlank(data.student.middleName)}
              flex={2.5}
            />
          </View>
          <View style={styles.infoRow}>
            <InfoField label="Sex" value={sex} flex={1} />
            <InfoField
              label="Birthdate"
              value={
                data.student.birthDate ? formatDate(data.student.birthDate) : ""
              }
              flex={2}
            />
            <InfoField label="Age" value={fmt(data.student.age)} flex={1} />
            <InfoField
              label="Birth Place"
              value={orBlank(data.student.birthPlace)}
              flex={3}
            />
            <InfoField
              label="Student No."
              value={data.student.studentNumber}
              flex={2}
            />
          </View>
        </View>

        {/* Eligibility for Junior High School Enrollment */}
        <View style={[styles.infoGrid, { marginTop: 7 }]}>
          <View style={styles.infoRowFirst}>
            <Text style={styles.sectionLabel}>
              Eligibility for Junior High School Enrollment
            </Text>
          </View>
          <View style={styles.infoRow}>
            <InfoField
              label="Certificate / Credential"
              value={orBlank(data.eligibility?.certificate)}
              flex={4}
            />
            <InfoField
              label="Name of School (previous)"
              value={orBlank(data.eligibility?.previousSchoolName)}
              flex={4}
            />
            <BlankField label="School ID:" flex={1.5} />
            <InfoField
              label="Grade Level"
              value={orBlank(data.eligibility?.previousGradeLevel)}
              flex={1.5}
            />
          </View>
          <View style={styles.infoRow}>
            <InfoField
              label="Address"
              value={orBlank(data.eligibility?.previousSchoolAddress)}
              flex={5}
            />
            <InfoField
              label="General Average"
              value={
                data.eligibility?.previousGeneralAverage
                  ? fmt(data.eligibility.previousGeneralAverage)
                  : ""
              }
              flex={2}
            />
            <InfoField
              label="Promotion Status"
              value={orBlank(data.eligibility?.promotionStatus)}
              flex={2.5}
            />
            <InfoField
              label="Honors / Distinction"
              value={orBlank(data.eligibility?.academicDistinction)}
              flex={2.5}
            />
          </View>
        </View>

        {/* Permanent academic record — one dense table per school year */}
        {data.blocks.length === 0 ? (
          <View style={[styles.emptyRow, { marginTop: 7 }]}>
            <Text>No academic records found for this learner yet.</Text>
          </View>
        ) : (
          <>
            <Text
              style={{
                fontSize: 9.5,
                fontWeight: "bold",
                textTransform: "uppercase",
                textAlign: "center",
                marginTop: 7,
              }}
            >
              Scholastic Record
            </Text>
            {data.blocks.map((block) => (
              <View key={block.enrollmentId} wrap={false}>
                <ScholasticRecordBlock block={block} />
              </View>
            ))}
            <RemedialBlock />

            {/* Certification + School Head signature (values from the database) */}
            <View style={[styles.cert, { marginTop: 10 }]} wrap={false}>
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  textAlign: "center",
                  paddingBottom: 3,
                }}
              >
                Certification
              </Text>
              <Text style={{ fontSize: 9.5, lineHeight: 1.5 }}>
                I CERTIFY that this is a true record of {data.student.name} with
                LRN {orBlank(data.student.lrn) || "\u00a0".repeat(12)} and that
                he/she is eligible for admission to{" "}
                {eligibleNext ?? "\u00a0Grade\u00a0"}. Last school year
                attended: {lastBlock?.schoolYear ?? ""}.
              </Text>
              <View style={{ flexDirection: "row", marginTop: 4 }}>
                <InfoField label="School" value={SCHOOL.name} flex={7} />
                <BlankField label="School ID:" flex={2} />
                <BlankField label="Date:" flex={2} />
              </View>
              <View style={styles.sigRow}>
                <SignatureBlock
                  name={data.principal ?? ""}
                  role="School Head over printed name"
                />
                <View style={styles.sealBox}>
                  <Text>(Affix School Dry Seal here)</Text>
                </View>
              </View>
            </View>

            {/* Authentication rule as printed on the official form */}
            <Text style={styles.printNote}>
              This copy is system-generated. Valid for all legal purposes only
              when it bears the original signature in ink of the School Head and
              the school dry seal (DepEd Order No. 54, s. 2016).
            </Text>
          </>
        )}
      </Page>
    </Document>
  );
};

export async function renderForm137Pdf(data: Form137Data): Promise<Uint8Array> {
  return renderToBuffer(form137Doc(data));
}
