import { eq, or } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { notify } from "@/lib/audit";

export type ActionState =
  | { ok: true; message?: string; redirectTo?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const ok = (message?: string, redirectTo?: string): ActionState => ({
  ok: true,
  message,
  redirectTo,
});

export const fail = (
  error: string,
  fieldErrors?: Record<string, string>,
): ActionState => ({ ok: false, error, fieldErrors });

/** Build a field-keyed error map from zod issues (first message per field). */
export function zodFieldErrors(
  issues: { path?: readonly (string | number | symbol)[]; message: string }[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path?.[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Best-effort client metadata for audit trail entries. */
export async function sessionMetadata(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    return {
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent") ?? null,
    };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/** Role ids used by seeds and actions (stable, deterministic). */
export const ROLE_IDS = {
  barangay: "role-barangay",
  lgu: "role-lgu",
  admin: "role-admin",
} as const;

/**
 * Notify every active user holding the given permission-bearing roles
 * (validators = admin + lgu). Best-effort — failures never throw.
 */
export async function notifyValidators(
  message: string,
  link: string,
  title = "Record awaiting validation",
): Promise<void> {
  try {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.roleId, ROLE_IDS.admin), eq(users.roleId, ROLE_IDS.lgu)));

    await Promise.all(
      rows.map((u) => notify({ userId: u.id, type: "validation", title, message, link })),
    );
  } catch (error) {
    console.error("[notifyValidators]", error);
  }
}

/** Best-effort lookup of the acting user's role label for audit metadata. */
export async function roleLabelFor(roleId: string): Promise<string> {
  try {
    const rows = await db.select({ name: roles.name }).from(roles).where(eq(roles.id, roleId)).limit(1);
    return rows[0]?.name ?? roleId;
  } catch {
    return roleId;
  }
}
