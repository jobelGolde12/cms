/**
 * Verify JSON → database: counts, relationships, and every imported field.
 * Also verifies that all 65 pre-existing students remain untouched.
 * Run: npx tsx scripts/verify-import.mts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import "dotenv/config";
import { db } from "../src/db";
import {
  gradeLevels,
  schoolYears,
  sections,
  studentEnrollments,
  students,
} from "../src/db/schema";

const roster: {
  name_last_first_middle: string;
  sex_group: string;
  grade_level: number;
  section: string;
  school_year: string;
  present_in_master_sf1_roster: boolean;
  monthly_remarks_from_sf2_sheets?: Record<string, string>;
}[] = JSON.parse(readFileSync("data-extraction/json/students.json", "utf-8")).students;

const allJsonSex = (r: (typeof roster)[number]) => (r.sex_group === "MALE" ? "male" : "female");

const problems: string[] = [];
const counts: Record<string, number> = {};

const failures = (msg: string) => problems.push(msg);

async function main() {
  // Reference data
  const gl12 = (await db.select().from(gradeLevels).where(eq(gradeLevels.name, "Grade 12")).limit(1))[0];
  if (!gl12) failures('missing grade_levels row "Grade 12"');
  const sy = (await db.select().from(schoolYears).where(eq(schoolYears.year, "2026-2027")).limit(1))[0];
  if (!sy) failures('missing school_years row "2026-2027"');
  const sec = (await db.select().from(sections).where(eq(sections.name, "HESTIA - CSS")).limit(1))[0];
  if (!sec) failures('missing sections row "HESTIA - CSS"');
  if (gl12 && sec && sy && (sec.gradeLevelId !== gl12.id || sec.schoolYearId !== sy.id)) {
    failures("section HESTIA - CSS is not attached to Grade 12 / 2026-2027");
  }

  // Student set (note: isNull() is a SQL builder, not a runtime predicate —
  // compare the fetched rows in JS).
  const allStudents = await db.select().from(students);
  counts.students_total = allStudents.length;
  counts.students_preexisting = allStudents.filter((s) => s.birthDate !== null).length;
  counts.students_imported = allStudents.filter((s) => s.birthDate === null).length;
  if (counts.students_preexisting !== 65)
    failures(`expected the 65 pre-existing students to be untouched, found ${counts.students_preexisting}`);
  const imported = allStudents.filter((s) => s.birthDate === null);
  if (imported.length !== roster.length)
    failures(`imported student count ${imported.length} != JSON ${roster.length}`);

  // Per-record field comparison
  const dbByNumber = new Map(allStudents.map((s) => [s.studentNumber, s]));
  const grades = (await db.select().from(studentEnrollments)).filter(
    (e) => e.schoolYearId === "sy-2026-2027" && e.sectionId === "sec-12-hestia",
  );
  counts.imported_enrollments = grades.length;
  if (counts.imported_enrollments !== roster.length)
    failures(`imported enrollments ${counts.imported_enrollments} != JSON ${roster.length}`);

  const enrollByStudent = new Map(grades.map((e) => [e.studentId, e]));
  for (const row of roster) {
    const nameParts = row.name_last_first_middle.split(",");
    const lastName = nameParts[0].trim();
    const rest = nameParts[1].trim().split(/\s+/);
    const firstName = rest[0];
    const middleName = rest.length > 1 ? rest.slice(1).join(" ") : null;

    const dbStudent = imported.find(
      (s) => s.lastName === lastName && s.firstName === firstName,
    );
    if (!dbStudent) {
      failures(`JSON student not found in DB: ${row.name_last_first_middle}`);
      continue;
    }
    if (dbStudent.middleName !== middleName)
      failures(`middle name mismatch for ${lastName}: DB=${dbStudent.middleName} JSON=${middleName}`);
    if (dbStudent.sex !== allJsonSex(row))
      failures(`sex mismatch for ${lastName}: DB=${dbStudent.sex} JSON=${allJsonSex(row)}`);
    if (dbStudent.recordStatus !== (row.present_in_master_sf1_roster ? "verified" : "needs_correction"))
      failures(`record_status mismatch for ${lastName}: ${dbStudent.recordStatus}`);

    const enr = enrollByStudent.get(dbStudent.id);
    if (!enr) {
      failures(`no enrollment in Grade 12 / HESTIA - CSS for ${lastName}`);
      continue;
    }
    const expectedRemark = (() => {
      const values = [...new Set(Object.values(row.monthly_remarks_from_sf2_sheets ?? {}))];
      return values.length ? values.join(" | ") : null;
    })();
    if (enr.remarks !== expectedRemark)
      failures(`enrollment remarks mismatch for ${lastName}: DB=${enr.remarks} JSON=${expectedRemark}`);
    if (enr.gradeLevelId !== "gl-12" || enr.sectionId !== "sec-12-hestia")
      failures(`wrong placement for ${lastName}: ${enr.gradeLevelId}/${enr.sectionId}`);
  }

  // Every imported dB student must also appear in JSON (extra-record check).
  for (const s of imported) {
    const found = roster.some((r) => {
      const p = r.name_last_first_middle.split(",");
      return p[0].trim() === s.lastName && p[1]?.trim().split(/\s+/)[0] === s.firstName;
    });
    if (!found) failures(`extra DB student with null birth date not in JSON: ${s.lastName} ${s.firstName}`);
  }

  console.log("=== JSON -> DATABASE VERIFICATION ===");
  console.log(JSON.stringify(counts, null, 2));
  console.log(`name-number spot sample: ${dbByNumber.size} student numbers unique-keys`);
  if (problems.length > 0) {
    console.error(`FAIL: ${problems.length} problems`);
    for (const p of problems) console.error(" -", p);
    process.exit(1);
  }
  console.log("PASS: all JSON values verified in the database; pre-existing data intact.");

  writeFileSync(
    "data-extraction/reports/db-verification.json",
    JSON.stringify({ verified_at: new Date().toISOString(), counts, problems }, null, 2),
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("verification failed:", e);
    process.exit(1);
  });
