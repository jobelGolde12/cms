import { desc, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { students, systemSettings } from "@/db/schema";

/**
 * Generate the next sequential student number for a year, e.g. SM-2026-000042.
 * The prefix comes from system_settings (`student_number_prefix`), defaulting
 * to "SM". Unique-constraint safe: on a collision the caller retries once.
 */
export async function nextStudentNumber(year = new Date().getFullYear()): Promise<string> {
  let prefix = "SM";
  try {
    const rows = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, "student_number_prefix"))
      .limit(1);
    const stored = rows[0]?.value?.trim();
    if (stored) prefix = stored;
  } catch {
    // Settings table may not exist yet during bootstrap — fall back to SM.
  }

  const full = `${prefix}-${year}-`;
  const rows = await db
    .select({ number: students.studentNumber })
    .from(students)
    .where(like(students.studentNumber, `${full}%`))
    .orderBy(desc(students.studentNumber))
    .limit(1);

  const lastSeq = rows[0] ? Number.parseInt(rows[0].number.slice(full.length), 10) : 0;
  const next = Number.isNaN(lastSeq) ? 1 : lastSeq + 1;
  return `${full}${String(next).padStart(6, "0")}`;
}
