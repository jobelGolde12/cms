import { desc, like } from "drizzle-orm";
import { db } from "@/db";
import { employees } from "@/db/schema";

/**
 * Generate the next sequential employee number, e.g. EMP-2026-000012.
 * Unique-constraint safe: on a (rare) collision the caller retries once.
 */
export async function nextEmployeeNumber(year = new Date().getFullYear()): Promise<string> {
  const full = `EMP-${year}-`;
  const rows = await db
    .select({ number: employees.employeeNumber })
    .from(employees)
    .where(like(employees.employeeNumber, `${full}%`))
    .orderBy(desc(employees.employeeNumber))
    .limit(1);

  const lastSeq = rows[0] ? Number.parseInt(rows[0].number.slice(full.length), 10) : 0;
  const next = Number.isNaN(lastSeq) ? 1 : lastSeq + 1;
  return `${full}${String(next).padStart(6, "0")}`;
}
