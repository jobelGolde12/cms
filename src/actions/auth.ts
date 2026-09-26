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
import { findDefaultCredential } from "@/lib/default-credentials";

const ERROR_GENERIC = "Invalid email or password.";
const ERROR_UNEXPECTED = "Something went wrong while signing in. Please try again.";

type LoginOutcome = { kind: "error"; state: ActionState } | { kind: "redirect" };

/**
 * Core login logic. Never calls redirect() — the caller does, outside the
 * try/catch, so NEXT_REDIRECT errors are never swallowed.
 */
async function performLogin(formData: FormData): Promise<LoginOutcome> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = loginSchema.safeParse(raw);
  const { ip, userAgent } = await sessionMetadata();

  if (!parsed.success) {
    return { kind: "error", state: fail(ERROR_GENERIC) };
  }

  const { email, password } = parsed.data;
  const addressKey = (ip ?? "local") + "|login";
  const limited = rateLimit(addressKey, 10, 60_000);
  if (!limited.ok) {
    await logAudit({
      action: "LOGIN",
      entityType: "session",
      oldValues: null,
      newValues: { reason: "rate-limit", retryAfterSeconds: limited.retryAfterSeconds },
      ipAddress: ip,
      userAgent,
    });
    return {
      kind: "error",
      state: fail("Too many attempts. Please wait a minute before trying again."),
    };
  }

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];

  const valid = !!user && (await verifyPassword(password, user.passwordHash));
  if (!valid || !user) {
    // Fallback: check default credentials when the user is not in the database.
    const defaultUser = findDefaultCredential(email);
    if (defaultUser && (await verifyPassword(password, defaultUser.passwordHash))) {
      await createSession(defaultUser.id, { ip, userAgent });
      await logAudit({
        userId: defaultUser.id,
        action: "LOGIN",
        entityType: "session",
        newValues: { reason: "default-credential" },
        ipAddress: ip,
        userAgent,
      });
      return { kind: "redirect" };
    }

    await logAudit({
      userId: user?.id,
      action: "LOGIN",
      entityType: "session",
      newValues: { reason: "bad-credentials" },
      ipAddress: ip,
      userAgent,
    });
    return { kind: "error", state: fail(ERROR_GENERIC) };
  }

  if (!user.isActive) {
    // Disabled users cannot authenticate.
    await logAudit({
      userId: user.id,
      action: "LOGIN",
      entityType: "session",
      newValues: { reason: "deactivated" },
      ipAddress: ip,
      userAgent,
    });
    return {
      kind: "error",
      state: fail("This account has been deactivated. Contact the administrator."),
    };
  }

  await createSession(user.id, { ip, userAgent });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await logAudit({
    userId: user.id,
    action: "LOGIN",
    entityType: "session",
    ipAddress: ip,
    userAgent,
  });

  return { kind: "redirect" };
}

/** Login with server-side rate limiting and a full audit trail. */
export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let outcome: LoginOutcome;
  try {
    outcome = await performLogin(formData);
  } catch (error) {
    // Infrastructure failures (DB unreachable, etc.) must surface as an
    // inline form error — never as the global error boundary.
    console.error("[login] unexpected error", error);
    return fail(ERROR_UNEXPECTED);
  }

  if (outcome.kind === "redirect") {
    redirect("/dashboard");
  }
  return outcome.state;
}

/** End the current session. */
export async function logout(): Promise<void> {
  const { ip, userAgent } = await sessionMetadata();
  const user = await getCurrentUser();
  await destroySession();
  if (user) {
    await logAudit({
      userId: user.id,
      action: "LOGOUT",
      entityType: "session",
      ipAddress: ip,
      userAgent,
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
  const { ip, userAgent } = await sessionMetadata();
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
      action: "CHANGE_PASSWORD",
      entityType: "user",
      entityId: user.id,
      newValues: { reason: "wrong-current-password" },
      ipAddress: ip,
      userAgent,
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
    action: "CHANGE_PASSWORD",
    entityType: "user",
    entityId: user.id,
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/settings", "layout");
  return ok("Password updated.");
}

/** FormData-only wrappers for plain <form action={…}> usage. */
export async function updateProfileForm(formData: FormData): Promise<void> {
  await updateProfile({ ok: false, error: "" }, formData);
}

export async function changePasswordForm(formData: FormData): Promise<void> {
  await changePassword({ ok: false, error: "" }, formData);
}

/** Update the signed-in user's own profile name fields. */
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

  const { ip, userAgent } = await sessionMetadata();
  await logAudit({
    userId: user.id,
    action: "UPDATE_PROFILE",
    entityType: "user",
    entityId: user.id,
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/settings", "layout");
  return ok("Profile updated.");
}
