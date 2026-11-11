"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { userRoles, users } from "@/db/schema";
import { getAuthorizedUser, hashPassword, revokeUserSessions } from "@/lib/auth";
import { logAudit, notify } from "@/lib/audit";
import { PENDING_ROLE_ID } from "@/lib/constants";
import { isDummyAccountEmail } from "@/lib/dummy-accounts";
import { rateLimit } from "@/lib/rate-limit";
import { registrationSchema } from "@/lib/schemas";
import {
  fail,
  ok,
  sessionMetadata,
  zodFieldErrors,
  type ActionState,
  ROLE_IDS,
} from "./helpers";

/**
 * Self-registration + administrator approval.
 *
 * The public form can only CREATE a `pending` account under the inert
 * `role-pending` placeholder. It accepts no role id at all — a crafted request
 * cannot choose a privileged role. Approval (role assignment included) is a
 * separate server action gated by `users.manage`.
 */

const GENERIC_REGISTER_ERROR = "Registration could not be completed. Please try again.";

/** Notify every active system administrator that a registration awaits review. */
async function notifyAdministrators(firstName: string, lastName: string): Promise<void> {
  try {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.roleId, ROLE_IDS.admin),
          eq(users.isActive, true),
          eq(users.isDummy, false),
        ),
      );
    await Promise.all(
      rows.map((admin) =>
        notify({
          userId: admin.id,
          type: "registration",
          title: "New account registration",
          message: `${firstName} ${lastName} requested an account. Review it under Users → Pending registrations.`,
          link: "/users",
        }),
      ),
    );
  } catch (error) {
    console.error("[registration] admin notification failed", error);
  }
}

/** Public self-registration — always lands in the `pending` state. */
export async function registerAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { ip, userAgent } = await sessionMetadata();
  const limited = rateLimit(`register:${ip ?? "local"}`, 5, 60 * 60_000);
  if (!limited.ok) {
    return fail("Too many registration attempts. Please try again later.");
  }

  const parsed = registrationSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  }
  const v = parsed.data;
  const email = v.email.trim().toLowerCase();

  if (isDummyAccountEmail(email)) {
    return fail("This email address cannot be used for registration.");
  }

  try {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing.length > 0) {
      return fail("An account with this email already exists. Try signing in or resetting your password.");
    }

    const newId = crypto.randomUUID();
    await db.insert(users).values({
      id: newId,
      roleId: PENDING_ROLE_ID,
      firstName: v.firstName,
      middleName: v.middleName?.trim() || null,
      lastName: v.lastName,
      email,
      phone: v.phone?.trim() || null,
      passwordHash: await hashPassword(v.password),
      status: "pending",
      requestedPosition: v.requestedPosition,
      registrationNote: v.registrationNote?.trim() || null,
      isActive: true,
      isDummy: false,
    });

    await logAudit({
      userId: newId,
      action: "REGISTER_ACCOUNT",
      entityType: "user",
      entityId: newId,
      // Never log password material or the raw request body.
      newValues: { status: "pending", requestedPosition: v.requestedPosition },
      ipAddress: ip,
      userAgent,
    });

    await notifyAdministrators(v.firstName, v.lastName);
  } catch (error) {
    console.error("[registerAccount] failed", error);
    return fail(GENERIC_REGISTER_ERROR);
  }

  revalidatePath("/users");
  return ok(
    "Registration submitted. An administrator will review your request — you cannot sign in until it is approved.",
  );
}

/* ------------------------------- approval -------------------------------- */

const ASSIGNABLE_ROLE_IDS: ReadonlySet<string> = new Set(Object.values(ROLE_IDS));

/** Approve a pending registration and assign the chosen application role. */
export async function approveRegistration(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await getAuthorizedUser("users.manage");
  const { ip, userAgent } = await sessionMetadata();
  if (!actor) return fail("Only an administrator can approve registrations.");

  const userId = String(formData.get("userId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");
  if (!userId || !ASSIGNABLE_ROLE_IDS.has(roleId)) {
    return fail("Select a valid system role before approving.");
  }

  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const target = rows[0];
  if (!target || target.isDummy) return fail("Registration not found.");
  if (target.status !== "pending") {
    return fail("Only pending registrations can be approved.");
  }

  try {
    await db
      .update(users)
      .set({
        roleId,
        status: "approved",
        isActive: true,
        reviewedBy: actor.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, target.id));

    // Keep the role union table in sync with the primary role.
    await db
      .insert(userRoles)
      .values({ userId: target.id, roleId })
      .onConflictDoNothing();
  } catch (error) {
    console.error("[approveRegistration] failed", error);
    return fail("Could not approve the registration. Please try again.");
  }

  await notify({
    userId: target.id,
    type: "account",
    title: "Account approved",
    message: "Your account has been approved. You can now sign in.",
    link: "/login",
  });

  await logAudit({
    userId: actor.id,
    action: "APPROVE_REGISTRATION",
    entityType: "user",
    entityId: target.id,
    oldValues: { status: target.status, roleId: target.roleId },
    newValues: { status: "approved", roleId },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/users");
  return ok("Registration approved and role assigned.");
}

/** Reject a pending registration. The account stays for the audit trail. */
export async function rejectRegistration(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await getAuthorizedUser("users.manage");
  const { ip, userAgent } = await sessionMetadata();
  if (!actor) return fail("Only an administrator can reject registrations.");

  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  if (!userId) return fail("Registration not found.");

  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const target = rows[0];
  if (!target || target.isDummy) return fail("Registration not found.");
  if (target.status !== "pending") {
    return fail("Only pending registrations can be rejected.");
  }

  await db
    .update(users)
    .set({
      status: "rejected",
      isActive: false,
      reviewedBy: actor.id,
      reviewedAt: new Date(),
      registrationNote: reason
        ? `${target.registrationNote ? `${target.registrationNote}\n` : ""}Review note: ${reason}`
        : target.registrationNote,
      updatedAt: new Date(),
    })
    .where(eq(users.id, target.id));

  await logAudit({
    userId: actor.id,
    action: "REJECT_REGISTRATION",
    entityType: "user",
    entityId: target.id,
    oldValues: { status: target.status },
    newValues: { status: "rejected", reason: reason || null },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/users");
  return ok("Registration rejected.");
}

/**
 * Change an account's lifecycle status (suspend / re-enable / disable).
 * Server-side `users.manage` only; every other session for the account is
 * revoked when access is removed.
 */
export async function setAccountStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await getAuthorizedUser("users.manage");
  const { ip, userAgent } = await sessionMetadata();
  if (!actor) return fail("Only an administrator can change account status.");

  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["approved", "suspended", "disabled"].includes(status)) {
    return fail("Invalid account status.");
  }
  if (userId === actor.id) return fail("You cannot change your own account status.");

  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const target = rows[0];
  if (!target || target.isDummy) return fail("User not found.");

  await db
    .update(users)
    .set({
      status,
      isActive: status === "approved",
      updatedAt: new Date(),
    })
    .where(eq(users.id, target.id));

  if (status !== "approved") {
    await revokeUserSessions(target.id);
    await db.delete(userRoles).where(eq(userRoles.userId, target.id));
  } else {
    await db
      .insert(userRoles)
      .values({ userId: target.id, roleId: target.roleId })
      .onConflictDoNothing();
  }

  await logAudit({
    userId: actor.id,
    action: "SET_ACCOUNT_STATUS",
    entityType: "user",
    entityId: target.id,
    oldValues: { status: target.status, isActive: target.isActive },
    newValues: { status },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/users");
  return ok(status === "approved" ? "Account re-enabled." : `Account marked ${status}.`);
}

