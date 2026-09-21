"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { children } from "@/db/schema";
import { getAuthorizedUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { QR_ELIGIBLE_STATUSES, type ValidationStatus } from "@/lib/constants";
import { canAccessChild } from "@/lib/scope";
import { createQrToken, deactivateChildTokens } from "@/lib/qr";
import { fail, ok, sessionMetadata, type ActionState } from "./helpers";

/** Generate (rotate) an active QR verification token for a verified child. */
export async function generateQr(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("qr.manage");
  const { ip } = await sessionMetadata();
  if (!user) return fail("You do not have permission to manage QR codes.");

  const childId = String(formData.get("childId") ?? "");
  const rows = await db.select().from(children).where(eq(children.id, childId)).limit(1);
  const child = rows[0];
  if (!child) return fail("Record not found.");
  if (!canAccessChild(user, child)) return fail("This record is outside your scope.");

  if (!QR_ELIGIBLE_STATUSES.includes(child.validationStatus as ValidationStatus)) {
    return fail("QR codes can only be generated for verified records.");
  }

  await createQrToken(child.id, user.id);

  await logAudit({
    userId: user.id,
    userRole: user.role,
    action: "qr.generate",
    entity: "child",
    entityId: child.id,
    result: "success",
    metadata: { code: child.childCode },
    ip,
  });

  revalidatePath(`/children/${child.id}`);
  return ok("QR code generated. The previous code is now inactive.");
}

/** Deactivate all QR tokens for a child (emergency revocation). */
export async function deactivateQr(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("qr.manage");
  const { ip } = await sessionMetadata();
  if (!user) return fail("You do not have permission.");

  const childId = String(formData.get("childId") ?? "");
  const rows = await db.select().from(children).where(eq(children.id, childId)).limit(1);
  const child = rows[0];
  if (!child) return fail("Record not found.");
  if (!canAccessChild(user, child)) return fail("This record is outside your scope.");

  await deactivateChildTokens(child.id);

  await logAudit({
    userId: user.id,
    userRole: user.role,
    action: "qr.deactivate",
    entity: "child",
    entityId: child.id,
    result: "success",
    ip,
  });

  revalidatePath(`/children/${child.id}`);
  return ok("QR code deactivated.");
}