import { desc, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { children, systemSettings } from "@/db/schema";

/**
 * Generate the next sequential child code for a year, e.g. CM-2026-000042.
 * The prefix comes from system_settings (`child_code_prefix`), defaulting to
 * "CM". Unique-constraint safe: on a collision the caller retries once.
 */
export async function nextChildCode(year = new Date().getFullYear()): Promise<string> {
  let prefix = "CM";
  try {
    const rows = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, "child_code_prefix"))
      .limit(1);
    const stored = rows[0]?.value?.trim();
    if (stored) prefix = stored;
  } catch {
    // Settings table may not exist yet during bootstrap — fall back to CM.
  }

  const full = `${prefix}-${year}-`;
  const rows = await db
    .select({ code: children.childCode })
    .from(children)
    .where(like(children.childCode, `${full}%`))
    .orderBy(desc(children.childCode))
    .limit(1);

  const lastSeq = rows[0] ? Number.parseInt(rows[0].code.slice(full.length), 10) : 0;
  const next = Number.isNaN(lastSeq) ? 1 : lastSeq + 1;
  return `${full}${String(next).padStart(6, "0")}`;
}
