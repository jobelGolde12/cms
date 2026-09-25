"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { getAuthorizedUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { fail, ok, sessionMetadata, type ActionState } from "./helpers";

/** Editable setting keys — never secrets (those live in environment variables). */
const EDITABLE_KEYS = new Set([
  "system_name",
  "child_code_prefix",
  "default_school_year",
  "maintenance_mode",
]);

/** FormData-only wrapper for plain <form action={…}> usage. */
export async function updateSystemSettingForm(formData: FormData): Promise<void> {
  await updateSystemSetting({ ok: false, error: "" }, formData);
}

/** Update a system setting by key (settings.manage permission). */
export async function updateSystemSetting(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("settings.manage");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to manage settings.");

  const key = String(formData.get("key") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  if (!key || !EDITABLE_KEYS.has(key)) return fail("Unknown or protected setting.");
  if (value.length > 200) return fail("Value is too long.");

  const rows = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);
  const existing = rows[0];
  if (!existing) return fail("Setting not found.");

  await db
    .update(systemSettings)
    .set({ value, updatedBy: user.id, updatedAt: new Date() })
    .where(eq(systemSettings.key, key));

  await logAudit({
    userId: user.id,
    action: "UPDATE_SETTING",
    entityType: "system_setting",
    entityId: key,
    oldValues: { value: existing.value },
    newValues: { value },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/settings");
  return ok("Setting updated.");
}
