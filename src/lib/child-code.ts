import { desc, like } from "drizzle-orm";
import { db } from "@/db";
import { children } from "@/db/schema";

/**
 * Generate the next sequential child code for a year, e.g. CM-2026-000042.
 * Unique-constraint safe: on the (astronomically unlikely) collision, the
 * caller retries with a fresh code.
 */
export async function nextChildCode(year = new Date().getFullYear()): Promise<string> {
  const prefix = `CM-${year}-`;
  const rows = await db
    .select({ code: children.childCode })
    .from(children)
    .where(like(children.childCode, `${prefix}%`))
    .orderBy(desc(children.childCode))
    .limit(1);

  const lastSeq = rows[0] ? Number.parseInt(rows[0].code.slice(prefix.length), 10) : 0;
  const next = Number.isNaN(lastSeq) ? 1 : lastSeq + 1;
  return `${prefix}${String(next).padStart(6, "0")}`;
}
