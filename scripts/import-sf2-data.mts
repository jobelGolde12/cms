/**
 * Import the XLSX-derived JSON (data-extraction/json/*.json) into the
 * configured Turso/libSQL database using the app's own Drizzle layer.
 *
 * Non-destructive + idempotent:
 *  - Reference data (school year, grade level "Grade 12", section "HESTIA - CSS")
 *    is upserted by unique keys, existing rows are left untouched.
 *  - Students are matched by last+first+middle name AND sex (the source workbook
 *    contains NO LRN/ID column — documented in data-extraction reports). If the
 *    name matches an existing student, the record is NOT modified; only a missing
 *    enrollment is added.
 *  - Duplicate-name matches inside the source are reported, never merged.
 *
 * Run: npx tsx scripts/import-sf2-data.mts [--dry-run] [--json-only]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import "dotenv/config";
import { db } from "../src/db";
import {
  auditLogs,
  gradeLevels,
  schoolYears,
  sections,
  studentEnrollments,
  students,
  users,
} from "../src/db/schema";
import { nextStudentNumber } from "../src/lib/student-number";

const DRY_RUN = process.argv.includes("--dry-run");

type StudentJson = {
  excel_row_sf1: number | null;
  excel_row_june_sheet?: number;
  sex_group: string;
  seq_no: number | null;
  name_last_first_middle: string;
  grade_level: number;
  section: string;
  school_year: string;
  present_in_master_sf1_roster: boolean;
  transferee_information?: Record<string, string>;
  monthly_remarks_from_sf2_sheets?: Record<string, string>;
  presence_note?: string;
};

type ExtractedJson = {
  school_master_roster: { meta: Record<string, unknown>; boys: unknown[]; girls: unknown[]; certification: Record<string, unknown> };
  dangling_transferee_records?: { excel_row: number; transferee_information: Record<string, string> }[];
  sf2_page2_boilerplate_reference?: Record<string, unknown>;
};

const studentsDoc = JSON.parse(readFileSync("data-extraction/json/students.json", "utf-8"));
const extractedDoc = JSON.parse(readFileSync("data-extraction/json/extracted-data.json", "utf-8")) as ExtractedJson;
const rows: StudentJson[] = studentsDoc.students;
const school: { school_id: string; school_name: string; school_year: string; grade_level: number; section: string } =
  studentsDoc.school;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();

/** "LAST, FIRST [MIDDLE]" — the workbook's documented name format (SF1 column header). */
function parseName(raw: string): { lastName: string; firstName: string; middleName: string | null } {
  const comma = raw.indexOf(",");
  if (comma < 0) throw new Error(`Unparseable name: ${raw}`);
  const lastName = raw.slice(0, comma).trim();
  const rest = raw.slice(comma + 1).trim();
  const parts = rest.split(/\s+/);
  const firstName = parts[0];
  const middleName = parts.length > 1 ? parts.slice(1).join(" ") : null;
  if (!lastName || !firstName) throw new Error(`Unparseable name: ${raw}`);
  return { lastName, firstName, middleName };
}

const report = {
  imported_at: new Date().toISOString(),
  source_files: ["data-extraction/json/students.json", "data-extraction/json/extracted-data.json"],
  dry_run: DRY_RUN,
  created_students: [] as string[],
  existing_students_matched: [] as string[],
  skipped_already_enrolled: [] as string[],
  enrollment_remarks_set: [] as string[],
  reference_rows_created: [] as string[],
  conflicts: [] as { name: string; issue: string }[],
  skipped_no_name: extractedDoc.dangling_transferee_records
    ? extractedDoc.dangling_transferee_records.map((d) => ({
        excel_row: d.excel_row,
        detail: "transferee data with no student name — cannot be attached",
        values: d.transferee_information,
      }))
    : [],
};

async function main() {
  // 1. Sanity: source school name/school id are single-school app context.
  console.log(`Source school: ${school.school_name} (${school.school_id})`);

  // 2. recordedBy: an existing administrative user (import acted under the admin account).
  const adminUser = (
    await db.select().from(users).where(eq(users.email, "admin@stamagdalena.gov.ph")).limit(1)
  )[0]
    ?? (await db.select().from(users).where(eq(users.id, "user-admin")).limit(1))[0];
  if (!adminUser) throw new Error("No administrative user found for recordedBy");
  console.log(`recordedBy: ${adminUser.id}`);

  // 3. Reference data (upsert-style by unique keys, never overwrite).
  let sy = (
    await db.select().from(schoolYears).where(eq(schoolYears.year, school.school_year)).limit(1)
  )[0];
  if (!sy) {
    sy = {
      id: `sy-${school.school_year}`,
      year: school.school_year,
      startDate: null,
      endDate: null,
      isCurrent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (!DRY_RUN) await db.insert(schoolYears).values(sy).onConflictDoNothing();
    report.reference_rows_created.push(`school_years:${school.school_year}`);
  }

  const gradeName = `Grade ${school.grade_level}`;
  let gl = (await db.select().from(gradeLevels).where(eq(gradeLevels.name, gradeName)).limit(1))[0];
  if (!gl) {
    const maxOrder = (
      await db.select().from(gradeLevels).orderBy(gradeLevels.orderIndex)
    ).slice(-1)[0]?.orderIndex ?? 0;
    gl = { id: `gl-${school.grade_level}`, name: gradeName, orderIndex: maxOrder + 1, createdAt: new Date(), updatedAt: new Date() };
    if (!DRY_RUN) await db.insert(gradeLevels).values(gl).onConflictDoNothing();
    report.reference_rows_created.push(`grade_levels:${gradeName}`);
  }

  let section = (
    await db
      .select()
      .from(sections)
      .where(and(eq(sections.schoolYearId, sy.id), eq(sections.gradeLevelId, gl.id), eq(sections.name, school.section)))
      .limit(1)
  )[0];
  if (!section) {
    section = {
      id: `sec-${school.grade_level}-hestia`,
      schoolYearId: sy.id,
      gradeLevelId: gl.id,
      name: school.section,
      adviserId: null, // SF1 adviser names are school staff, not app users
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (!DRY_RUN) {
      await db.insert(sections).values(section).onConflictDoNothing();
      section = (
        await db
          .select()
          .from(sections)
          .where(and(eq(sections.schoolYearId, sy.id), eq(sections.name, school.section)))
          .limit(1)
      )[0];
    }
    report.reference_rows_created.push(`sections:${school.section}`);
  }
  console.log(`Reference: ${sy.year} / ${gradeName} / ${school.section}`);

  // 4. Remarks are PER STUDENT: the SF2 remarks column belongs to the learner's
  //    own row (e.g. LATAG's transfer-in remark must not be attached to others).
  const remarkFor = (row: StudentJson): string | null => {
    const values = Object.values(row.monthly_remarks_from_sf2_sheets ?? {});
    const distinct = [...new Set(values)];
    return distinct.length > 0 ? distinct.join(" | ") : null;
  };
  /** Import artifact observed after the first (buggy) run: roster-wide remark. */
  const importArtifactRemarks = new Set(["T/I - SYSTEMS PLUS COMPUTER COLLEGE"]);
  const importOwnRemark = (current: string | null, target: string | null): boolean =>
    current !== target && (current === null || importArtifactRemarks.has(current.trim()));

  // 5. Students.
  for (const row of rows) {
    const parsed = parseName(row.name_last_first_middle);
    // Match existing student by full parsed name + sex (no LRN exists in source).
    const candidates = (await db.select().from(students).where(eq(students.lastName, parsed.lastName)))
      .filter((s) => s.sex === (row.sex_group === "MALE" ? "male" : "female"))
      .filter(
        (s) =>
          norm(s.firstName) === norm(parsed.firstName) &&
          norm(s.middleName ?? "") === norm(parsed.middleName ?? ""),
      );

    if (candidates.length > 1) {
      report.conflicts.push({
        name: row.name_last_first_middle,
        issue: `Ambiguous match: ${candidates.length} existing students share this name and sex`,
      });
      continue;
    }

    const remarks = remarkFor(row);

    let studentId: string;
    if (candidates.length === 1) {
      studentId = candidates[0].id;
      report.existing_students_matched.push(row.name_last_first_middle);
    } else {
      studentId = randomUUID();
      if (!DRY_RUN) {
        const studentNumber = await nextStudentNumber(2026);
        await db.insert(students).values({
          id: studentId,
          studentNumber,
          firstName: parsed.firstName,
          middleName: parsed.middleName,
          lastName: parsed.lastName,
          suffix: null,
          birthDate: null, // the source provides no birth dates
          sex: row.sex_group === "MALE" ? "male" : "female",
          contactNumber: null,
          address: null,
          status: "active",
          recordStatus: row.present_in_master_sf1_roster ? "verified" : "needs_correction",
          createdBy: adminUser.id,
          updatedBy: adminUser.id,
        });
        await db.insert(auditLogs).values({
          id: randomUUID(),
          userId: adminUser.id,
          action: "IMPORT_STUDENT",
          entityType: "student",
          entityId: studentId,
          newValuesJson: JSON.stringify({
            source: "SF1/SF2 XLSX import",
            names_source: row.name_last_first_middle,
            excel_rows: { sf1: row.excel_row_sf1, june_sheet: row.excel_row_june_sheet ?? null },
            record_status: row.present_in_master_sf1_roster ? "verified" : "needs_correction",
          }),
          ipAddress: null,
          userAgent: "import-sf2-data.mts",
        });
      }
      report.created_students.push(row.name_last_first_middle);
    }

    // 6. Enrollment for (student, school year) — unique on pair.
    const existingEnrollments = await db
      .select()
      .from(studentEnrollments)
      .where(and(eq(studentEnrollments.studentId, studentId), eq(studentEnrollments.schoolYearId, sy.id)));
    if (existingEnrollments.length > 0) {
      const enr = existingEnrollments[0];
      report.skipped_already_enrolled.push(row.name_last_first_middle);
      // Correct only import-owned remark values (empty, or the roster-wide
      // artifact left by the first import run); user-entered remarks stay.
      if (importOwnRemark(enr.remarks, remarks) && !DRY_RUN) {
        await db
          .update(studentEnrollments)
          .set({ remarks, updatedAt: new Date() })
          .where(eq(studentEnrollments.id, enr.id));
        report.enrollment_remarks_set.push(`${row.name_last_first_middle}: ${remarks ?? "(cleared)"}`);
      }
      continue;
    }
    if (!DRY_RUN) {
      await db.insert(studentEnrollments).values({
        id: randomUUID(),
        studentId,
        schoolYearId: sy.id,
        gradeLevelId: gl.id,
        sectionId: section.id,
        status: "active",
        enrollmentDate: null, // not present in the source
        remarks,
        recordedBy: adminUser.id,
      });
    }
    report.enrollment_remarks_set.push(row.name_last_first_middle);
  }

  // 6. Summary
  console.log("\n=== IMPORT SUMMARY ===");
  console.log(`created:            ${report.created_students.length}`);
  console.log(`matched existing:   ${report.existing_students_matched.length}`);
  console.log(`already enrolled:   ${report.skipped_already_enrolled.length}`);
  console.log(`remarks set:        ${report.enrollment_remarks_set.length}`);
  console.log(`reference created:  ${report.reference_rows_created.length}`);
  console.log(`conflicts:          ${report.conflicts.length}`);
  console.log(`skipped (no name):  ${report.skipped_no_name.length}`);
  if (report.conflicts.length > 0) console.log(JSON.stringify(report.conflicts, null, 2));

  if (!DRY_RUN) writeReport();
}

function writeReport(): void {
  writeFileSync(
    "data-extraction/reports/import-report.json",
    JSON.stringify(report, null, 2),
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Import failed:", e);
    process.exit(1);
  });
