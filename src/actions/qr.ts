"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { children } from "@/db/schema";
import { getAuthorizedUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { QR_ELIGIBLE_RECORD_STATUSES, type RecordStatus } from "@/lib/constants";
import { canAccessChild } from "@/lib/scope";
import { createQrToken, deactivateChildTokens } from "@/lib/qr";
import { fail, ok, sessionMetadata, type ActionState } from "./helpers";

/** Issue (rotate) an active QR verification token for a verified child. */
export async function generateQr(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("qr.verify");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to manage QR codes.");

  const childId = String(formData.get("childId") ?? "");
  const rows = await db.select().from(children).where(eq(children.id, childId)).limit(1);
  const child = rows[0];
  if (!child) return fail("Record not found.");
  if (!canAccessChild(user, child)) return fail("This record is outside your scope.");

  if (!QR_ELIGIBLE_RECORD_STATUSES.includes(child.recordStatus as RecordStatus)) {
    return fail("QR codes can only be generated for verified records.");
  }

  // The token is an opaque random reference — no personal information.
  await createQrToken(child.id, user.id, { ipAddress: ip, userAgent });

  await logAudit({
    userId: user.id,
    action: "VERIFY_QR",
    entityType: "child",
    entityId: child.id,
    newValues: { verificationType: "generate", childCode: child.childCode },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath(`/children/${child.id}`);
  revalidatePath("/qr");
  return ok("QR token generated. Any previous token is now superseded.");
}

/** Revoke all active QR tokens for a child (emergency revocation). */
export async function deactivateQr(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("qr.verify");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission.");

  const childId = String(formData.get("childId") ?? "");
  const rows = await db.select().from(children).where(eq(children.id, childId)).limit(1);
  const child = rows[0];
  if (!child) return fail("Record not found.");
  if (!canAccessChild(user, child)) return fail("This record is outside your scope.");

  await deactivateChildTokens(child.id, user.id);

  await logAudit({
    userId: user.id,
    action: "VERIFY_QR",
    entityType: "child",
    entityId: child.id,
    newValues: { verificationType: "revoke" },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath(`/children/${child.id}`);
  revalidatePath("/qr");
  return ok("QR tokens revoked.");
}
