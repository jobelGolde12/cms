"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  createSession,
  destroySession,
  getAuthorizedUser,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { loginSchema, changePasswordSchema } from "@/lib/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";

const ERROR_GENERIC = "Invalid email or password.";

/** Login with server-side rate limiting and a full audit trail. */
export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = loginSchema.safeParse(raw);
  const { ip, userAgent } = await sessionMetadata();

  if (!parsed.success) {
    return fail(ERROR_GENERIC);
  }

  const { email, password } = parsed.data;
  const addressKey = (ip ?? "local") + "|login";
  const limited = rateLimit(addressKey, 10, 60_000);
  if (!limited.ok) {
    await logAudit({
      action: "auth.login",
      entity: "session",
      result: "denied",
      metadata: { email, reason: "rate-limit", retryAfterSeconds: limited.retryAfterSeconds },
      ip,
    });
    return fail("Too many attempts. Please wait a minute before trying again.");
  }

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];

  const valid = !!user && (await verifyPassword(password, user.passwordHash));
  if (!valid || !user) {
    await logAudit({
      userId: user?.id,
      userRole: user?.role,
      action: "auth.login",
      entity: "session",
      result: "denied",
      metadata: { email, reason: "bad-credentials" },
      ip,
    });
    return fail(ERROR_GENERIC);
  }

  if (!user.isActive) {
    await logAudit({
      userId: user.id,
      userRole: user.role,
      action: "auth.login",
      entity: "session",
      result: "denied",
      metadata: { email, reason: "deactivated" },
      ip,
    });
    return fail("This account has been deactivated. Contact the administrator.");
  }

  await createSession(user.id, { ip, userAgent });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await logAudit({
    userId: user.id,
    userRole: user.role,
    action: "auth.login",
    entity: "session",
    result: "success",
    ip,
  });

  redirect("/dashboard");
}

/** End the current session. */
export async function logout(): Promise<void> {
  const { ip } = await sessionMetadata();
  const user = await getCurrentUser();
  await destroySession();
  if (user) {
    await logAudit({
      userId: user.id,
      userRole: user.role,
      action: "auth.logout",
      entity: "session",
      result: "success",
      ip,
    });
  }
  redirect("/login");
}

/** Change the current user's password (requires the existing password). */
export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("children.view");
  const { ip } = await sessionMetadata();
  if (!user) return fail("You must be signed in.");

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Check the password fields.", zodFieldErrors(parsed.error.issues));
  }

  const { currentPassword, newPassword } = parsed.data;

  const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const current = rows[0];
  if (!current || !(await verifyPassword(currentPassword, current.passwordHash))) {
    await logAudit({
      userId: user.id,
      userRole: user.role,
      action: "auth.change_password",
      entity: "user",
      entityId: user.id,
      result: "denied",
      metadata: { reason: "wrong-current-password" },
      ip,
    });
    return fail("Your current password is incorrect.");
  }

  if (currentPassword === newPassword) {
    return fail("The new password must be different from the current one.");
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await logAudit({
    userId: user.id,
    userRole: user.role,
    action: "auth.change_password",
    entity: "user",
    entityId: user.id,
    result: "success",
    ip,
  });

  revalidatePath("/settings", "layout");
  return ok("Password updated.");
}

/** Log a successful "switched to a demo role" or future self-service profile edit. */
export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("children.view");
  if (!user) return fail("You must be signed in.");

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  if (!firstName || !lastName) return fail("Name is required.");

  await db
    .update(users)
    .set({ firstName, lastName, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  const { ip } = await sessionMetadata();
  await logAudit({
    userId: user.id,
    userRole: user.role,
    action: "profile.update",
    entity: "user",
    entityId: user.id,
    result: "success",
    ip,
  });

  revalidatePath("/settings", "layout");
  return ok("Profile updated.");
}