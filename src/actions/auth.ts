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
  roleNameFromId,
  verifyPassword,
} from "@/lib/auth";
import { resolveDashboardForRoles } from "@/lib/dashboard";
import { roleKeysForUser } from "@/lib/user-roles";
import { logAudit } from "@/lib/audit";
import { loginSchema, changePasswordSchema, profileSchema } from "@/lib/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { createMfaChallenge } from "@/lib/mfa";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";
import { findDefaultCredential } from "@/lib/default-credentials";
import { trackEvent } from "@/lib/analytics";

const REMEMBER_ME_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const ERROR_GENERIC = "Invalid email or password.";
const ERROR_UNEXPECTED = "Something went wrong while signing in. Please try again.";

type LoginOutcome =
  | { kind: "error"; state: ActionState }
  | { kind: "redirect"; to: string };

/** Error for an account that cannot be mapped to a usable application role. */
const ERROR_NO_ROLE =
  "Your account does not have a valid role assigned. Contact the school administrator.";

/**
 * Resolve the post-login destination from the SAME role data the session
 * resolver uses. Unknown primary roles are rejected instead of creating a
 * session that no page would accept (the old behaviour bounced the user
 * between /login and /dashboard).
 */
async function resolveLoginDestination(user: {
  id: string;
  roleId: string;
}): Promise<LoginOutcome> {
  const primaryRole = roleNameFromId(user.roleId);
  if (!primaryRole) return { kind: "error", state: fail(ERROR_NO_ROLE) };

  const roles = await roleKeysForUser(user.id, user.roleId);
  return {
    kind: "redirect",
    to: resolveDashboardForRoles(primaryRole, roles).path,
  };
}

/**
 * Core login logic. Never calls redirect() — the caller does, outside the
 * try/catch, so NEXT_REDIRECT errors are never swallowed.
 */
async function performLogin(formData: FormData): Promise<LoginOutcome> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = loginSchema.safeParse(raw);
  const rememberMe = String(raw.rememberMe ?? "").toLowerCase() === "on" || String(raw.rememberMe ?? "") === "true";
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
    await trackEvent("login_failed", { result: "rate-limit" });
    return {
      kind: "error",
      state: fail("Too many attempts. Please wait a minute before trying again."),
    };
  }

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];

  const valid = !!user && (await verifyPassword(password, user.passwordHash));
  if (!valid || !user) {
    // Fallback for deployments that expose the seeded default credentials
    // through the environment only. The session is ALWAYS issued for the real
    // `users` row — never for the environment's synthetic id — and the same
    // active/approved/role gates as the normal path apply.
    const defaultUser = findDefaultCredential(email);
    if (defaultUser && (await verifyPassword(password, defaultUser.passwordHash))) {
      const seededRows = await db
        .select()
        .from(users)
        .where(eq(users.email, defaultUser.email))
        .limit(1);
      const account = seededRows[0];

      if (
        !account ||
        !account.isActive ||
        account.status !== "approved" ||
        !roleNameFromId(account.roleId)
      ) {
        await logAudit({
          userId: account?.id,
          action: "LOGIN",
          entityType: "session",
          newValues: { reason: "default-credential-missing-or-invalid" },
          ipAddress: ip,
          userAgent,
        });
        await trackEvent("login_failed", { result: "default-credential" });
        return { kind: "error", state: fail(ERROR_GENERIC) };
      }

      await createSession(account.id, {
        ip,
        userAgent,
        ttlMs: rememberMe ? REMEMBER_ME_TTL_MS : undefined,
      });
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, account.id));
      await logAudit({
        userId: account.id,
        action: "LOGIN",
        entityType: "session",
        newValues: { reason: "default-credential" },
        ipAddress: ip,
        userAgent,
      });
      return resolveLoginDestination(account);
    }

    await logAudit({
      userId: user?.id,
      action: "LOGIN",
      entityType: "session",
      newValues: { reason: "bad-credentials" },
      ipAddress: ip,
      userAgent,
    });
    await trackEvent("login_failed", { result: "bad-credentials" });
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
    await trackEvent("login_failed", { result: "deactivated" });
    return {
      kind: "error",
      state: fail("This account has been deactivated. Contact the administrator."),
    };
  }

  // Account lifecycle gate: a self-registered account cannot sign in until an
  // administrator has approved it and assigned a role. The role placeholder
  // itself is unknown to the permission map, so this is defence in depth.
  if (user.status !== "approved") {
    const reason =
      user.status === "pending"
        ? "Registration is awaiting administrator approval."
        : user.status === "rejected"
          ? "This registration was rejected. Contact the school administrator."
          : user.status === "suspended"
            ? "This account is suspended. Contact the school administrator."
            : "This account is disabled. Contact the school administrator.";
    await logAudit({
      userId: user.id,
      action: "LOGIN",
      entityType: "session",
      newValues: { reason: `account-${user.status}` },
      ipAddress: ip,
      userAgent,
    });
    await trackEvent("login_failed", { result: `account-${user.status}` });
    return { kind: "error", state: fail(reason) };
  }

  // The account must map to a real application role BEFORE a session is
  // issued. Otherwise the session would exist but every page would reject it.
  const destination = await resolveLoginDestination(user);
  if (destination.kind === "error") {
    await logAudit({
      userId: user.id,
      action: "LOGIN",
      entityType: "session",
      newValues: { reason: "no-valid-role", roleId: user.roleId },
      ipAddress: ip,
      userAgent,
    });
    await trackEvent("login_failed", { result: "no-valid-role" });
    return destination;
  }

  // Second factor: password verified, but NO session is created yet. The
  // short-lived challenge cookie only proves the password step; a complete
  // session can only be issued after the TOTP/recovery code is verified.
  if (user.mfaEnabled && user.mfaSecret) {
    await createMfaChallenge(user.id);
    await logAudit({
      userId: user.id,
      action: "LOGIN_MFA_CHALLENGE",
      entityType: "session",
      newValues: { reason: "mfa-required" },
      ipAddress: ip,
      userAgent,
    });
    return { kind: "redirect", to: "/login/mfa" };
  }

  await createSession(user.id, {
    ip,
    userAgent,
    ttlMs: rememberMe ? REMEMBER_ME_TTL_MS : undefined,
  });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await logAudit({
    userId: user.id,
    action: "LOGIN",
    entityType: "session",
    ipAddress: ip,
    userAgent,
  });
  await trackEvent("login_completed", { user_role: user.roleId ?? "unknown" });

  return destination;
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
    redirect(outcome.to);
  }
  return outcome.state;
}

/** End the current session. */
export async function logout(): Promise<void> {
  const { ip, userAgent } = await sessionMetadata();
  const user = await getCurrentUser();
  try {
    await destroySession();
  } catch (error) {
    console.error("[logout] session destruction failed", error);
  }
  if (user) {
    await logAudit({
      userId: user.id,
      action: "LOGOUT",
      entityType: "session",
      ipAddress: ip,
      userAgent,
    });
    await trackEvent("logout_completed", { user_role: user.role ?? "unknown" });
  }
  redirect("/login");
}

/** Change the current user's password (requires the existing password). */
export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("dashboard.view");
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
  const user = await getAuthorizedUser("dashboard.view");
  if (!user) return fail("You must be signed in.");

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const parsed = profileSchema.safeParse({ firstName, lastName });
  if (!parsed.success) {
    return fail("Name is required.", zodFieldErrors(parsed.error.issues));
  }
  const v = parsed.data;

  await db
    .update(users)
    .set({ firstName: v.firstName, lastName: v.lastName, updatedAt: new Date() })
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
