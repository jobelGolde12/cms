import { eq } from "drizzle-orm";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";

/**
 * Read a single editable system setting (server-side only).
 *
 * Settings are administrative configuration (never secrets — those live in
 * environment variables, see `src/actions/settings.ts`). Returns null when the
 * key is absent, and also when the database is unreachable: a settings lookup
 * must never take the app down, so callers get the documented default.
 */
export async function getSystemSetting(key: string): Promise<string | null> {
  try {
    const rows = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);
    return rows[0]?.value ?? null;
  } catch (error) {
    console.error("[system-settings] read failed", { key, error });
    return null;
  }
}

/** Truthy maintenance flag — only the explicit string "true" enables it. */
export function isMaintenanceModeOn(value: string | null | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}
