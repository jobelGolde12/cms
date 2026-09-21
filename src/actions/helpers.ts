import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
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

/**
 * Notify every active user who can validate records (admin/lgu) about a
 * submission awaiting validation. Best-effort — failures never throw.
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
      .where(eq(users.role, "admin"));
    const lgus = await db.select({ id: users.id }).from(users).where(eq(users.role, "lgu"));

    await Promise.all(
      [...rows, ...lgus].map((u) =>
        notify({ userId: u.id, type: "validation", title, body: message, link }),
      ),
    );
  } catch (error) {
    console.error("[notifyValidators]", error);
  }
}