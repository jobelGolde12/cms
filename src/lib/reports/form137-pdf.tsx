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
 * Server-side PDF rendering for the SF9 — Learner's Permanent Academic
 * Record (formerly Form 137), using the same stack as the report card
 * (@react-pdf/renderer — already a project dependency).
 *
 * Visual treatment follows the official DepEd spreadsheet/record style the
 * requester pointed at: Landscape A4, white background, thin black grid
 * lines, dense compact tables, formal serif typography, logo + DepEd
 * letterhead. The SF2-style attendance grid from that reference is
 * deliberately NOT copied — this document is strictly an academic record.
 *
 * Every displayed value comes from `Form137Data` (database-derived via
 * `src/lib/form137.ts`) — nothing about the learner is hardcoded. Read-only
 * — renders a buffer only, never writes to the database.
 */

const FONT = "Times-Roman";

/** School seal asset (public/logo.png, 1516x1038) at its natural ratio. */
const LOGO_ASPECT = 1516 / 1038;
let logoSrc: string | null = null;
function getLogoSrc(): string | null {
  if (logoSrc !== null) return logoSrc;
  try {
    logoSrc = fs.readFileSync(path.join(process.cwd(), "public", "logo.png")).toString("base64");
  } catch {
    logoSrc = ""; // header renders text-only when the asset cannot be read
  }
  return logoSrc;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingBottom: 50,
    paddingHorizontal: 30,
    fontSize: 8.5,
    fontFamily: FONT,
    color: "#111111",
  },
  letterhead: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  logo: { height: 40, width: 40 * LOGO_ASPECT, marginRight: 6 },
  letterheadText: {
    flex: 1,
    textAlign: "center",
    fontSize: 9,
    lineHeight: 1.25,
  },
  schoolName: { fontSize: 10, fontWeight: "bold" },
  titleBlock: {
    marginTop: 5,
    textAlign: "center",
  },
  title: { fontSize: 11.5, fontWeight: "bold" },
  subtitle: { fontSize: 8.5 },

  infoGrid: {
    marginTop: 6,
    border: "0.6pt solid #111111",
  },
  infoRow: {
    flexDirection: "row",
    borderBottom: "0.6pt solid #111111",
  },
  infoRowLast: {
    flexDirection: "row",
  },
  infoCell: {
    flexDirection: "row",
    alignItems: "flex-end",
    flexGrow: 1,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRight: "0.6pt solid #111111",
  },
  infoLabel: { fontSize: 8 },
  infoLine: {
    borderBottom: "0.6pt solid #111111",
    flex: 1,
    height: 11,
    justifyContent: "center",
    marginLeft: 3,
  },
  infoValue: { fontSize: 8.5, textAlign: "center" },

  yearTitle: {
    marginTop: 8,
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    border: "0.6pt solid #111111",
    borderBottom: "none",
    paddingVertical: 2.5,
    paddingHorizontal: 4,
    textAlign: "center",
  },
  th: {
    fontSize: 8,
    fontWeight: "bold",
    paddingVertical: 2.5,
    paddingHorizontal: 3,
    textAlign: "center",
    borderRight: "0.6pt solid #111111",
  },
  tableRow: { flexDirection: "row", border: "0.6pt solid #111111" },
  td: {
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 3,
    textAlign: "center",
    borderRight: "0.6pt solid #111111",
  },
  tdLeft: {
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 3,
    textAlign: "left",
    borderRight: "0.6pt solid #111111",
  },
  lastCol: { borderRight: "none" },
  emptyRow: {
    border: "0.6pt solid #111111",
    padding: 6,
    fontSize: 8,
    color: "#444444",
    textAlign: "center",
  },

  cert: {
    marginTop: 10,
    fontSize: 9.5,
    lineHeight: 1.35,
  },
  sigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  sigName: { fontSize: 9, fontWeight: "bold", textAlign: "center" },
  sigRole: { fontSize: 7.5, textAlign: "center" },
});

const fmt = (n: number | null | undefined) => (n == null ? "" : String(n));
const orBlank = (s: string | null | undefined) => s ?? "";

/* -------------------------------------------------------------------------- */
/*  Building blocks                                                           */
/* -------------------------------------------------------------------------- */

/** "Label ______value______" inside a bordered info cell. */
function InfoField({ label, value, flex }: { label: string; value: string; flex: number }) {
  return (
    <View style={[styles.infoCell, { flex }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoLine}>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const GRADE_COL_WIDTHS = ["31%", "7.5%", "7.5%", "7.5%", "7.5%", "11%", "28%"];

/** One school-year block of the permanent record. */
function YearBlock({
  block,
}: {
  block: Form137Data["blocks"][number];
}) {
  const title = `School Year ${block.schoolYear} — ${block.gradeLevel}${
    block.section ? ` — Section ${block.section}` : ""
  }${block.adviser ? ` (Adviser: ${block.adviser})` : ""}`;
  return (
    <View wrap={false}>
      <Text style={styles.yearTitle}>{title}</Text>
      {/* Header row: Learning Areas | Q1..Q4 | Final Rating | Remarks */}
      <View style={[styles.tableRow, { borderTop: "none" }]}>
        {["Learning Areas", ...SF9_HEADERS, "Final Rating", "Remarks"].map((h, i) => (
          <Text key={h} style={[styles.th, { width: GRADE_COL_WIDTHS[i] }, i === 6 ? styles.lastCol : undefined]}>
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
            <View key={s.subjectCode} style={[styles.tableRow, { borderTop: "none" }]} wrap={false}>
              <Text style={[styles.tdLeft, { width: GRADE_COL_WIDTHS[0] }]}>{s.subjectName}</Text>
              {s.quarters.map((g, i) => (
                <Text key={i} style={[styles.td, { width: GRADE_COL_WIDTHS[i + 1] }]}>
                  {fmt(g)}
                </Text>
              ))}
              <Text style={[styles.td, { width: GRADE_COL_WIDTHS[5], fontWeight: "bold" }]}>
                {fmt(s.finalGrade)}
              </Text>
              <Text style={[styles.td, styles.lastCol, { width: GRADE_COL_WIDTHS[6] }]}>
                {orBlank(s.remark)}
              </Text>
            </View>
          ))}
          <View style={[styles.tableRow, { borderTop: "none" }]} wrap={false}>
            <Text style={[styles.tdLeft, { width: GRADE_COL_WIDTHS[0], fontWeight: "bold" }]}>
              General Average
            </Text>
            {[0, 1, 2, 3].map((i) => (
              <Text key={i} style={[styles.td, { width: GRADE_COL_WIDTHS[i + 1] }]} />
            ))}
            <Text style={[styles.td, { width: GRADE_COL_WIDTHS[5], fontWeight: "bold" }]}>
              {fmt(block.generalAverage)}
            </Text>
            <Text style={[styles.td, styles.lastCol, { width: GRADE_COL_WIDTHS[6] }]} />
          </View>
        </>
      )}
    </View>
  );
}

const SF9_HEADERS = ["1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter"];

function SignatureBlock({ name, role }: { name: string; role: string }) {
  return (
    <View style={{ width: "30%", alignItems: "center" }}>
      <Text style={styles.sigName}>{orBlank(name) || "\u00a0"}</Text>
      <Text style={[styles.sigRole, { borderTop: "0.6pt solid #94a3b8", paddingTop: 2, alignSelf: "stretch" }]}>
        {role}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Document                                                                  */
/* -------------------------------------------------------------------------- */

const form137Doc = (data: Form137Data) => {
  const logo = getLogoSrc();
  const sex = data.student.sex
    ? data.student.sex.charAt(0).toUpperCase() + data.student.sex.slice(1)
    : "";

  return (
    <Document title={`SF9 — Learner's Permanent Academic Record — ${data.student.name}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
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
            <Text>Region V</Text>
            <Text>SCHOOLS DIVISION OF SORSOGON</Text>
            <Text style={styles.schoolName}>{SCHOOL.name.toUpperCase()}</Text>
            <Text>{SCHOOL.address}</Text>
          </View>
        </View>

        {/* Document title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>LEARNER&apos;S PERMANENT ACADEMIC RECORD</Text>
          <Text style={styles.subtitle}>(SF9 — formerly Form 137)</Text>
        </View>

        {/* Learner information — ruled fields in a bordered grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoRow}>
            <InfoField label="Name" value={data.student.name} flex={3} />
            <InfoField label="LRN" value={orBlank(data.student.lrn)} flex={2} />
            <InfoField label="Sex" value={sex} flex={1} />
          </View>
          <View style={styles.infoRowLast}>
            <InfoField
              label="Birth Date"
              value={data.student.birthDate ? formatDate(data.student.birthDate) : ""}
              flex={2}
            />
            <InfoField label="Age" value={fmt(data.student.age)} flex={1} />
            <InfoField label="Student No." value={data.student.studentNumber} flex={2} />
          </View>
        </View>

        {/* Permanent academic record — one dense table per school year */}
        {data.blocks.length === 0 ? (
          <View style={[styles.emptyRow, { marginTop: 8 }]}>
            <Text>
              No academic records found for this learner yet.
            </Text>
          </View>
        ) : (
          data.blocks.map((block) => <YearBlock key={block.enrollmentId} block={block} />)
        )}

        {/* Certification + signatures (values from the database) */}
        {data.blocks.length > 0 ? (
          <>
            <Text style={styles.cert}>
              I certify that the above is a true and correct record of the academic performance of
              the learner named in this document.
            </Text>
            <View style={styles.sigRow}>
              <SignatureBlock name={data.blocks[data.blocks.length - 1]?.adviser ?? ""} role="Adviser" />
              <SignatureBlock name={data.principal ?? ""} role="Secondary School Principal III" />
              <SignatureBlock name="" role="Registrar" />
            </View>
          </>
        ) : null}
      </Page>
    </Document>
  );
};

export async function renderForm137Pdf(data: Form137Data): Promise<Uint8Array> {
  return renderToBuffer(form137Doc(data));
}
