import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { sessions, userRoles, users } from "@/db/schema";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  type Role,
} from "./constants";
import { hasUserPermission, type Permission } from "./permissions";

/* ------------------------------ passwords -------------------------------- */

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/* ------------------------------- sessions -------------------------------- */

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  /**
   * PRIMARY role — drives the default workspace and the role badge. Always
   * present in `roles` (an unknown primary role ⇒ no access at all).
   */
  role: Role;
  /**
   * EVERY role the account holds (primary role first). One teacher can be both
   * an Adviser and a Subject Teacher without a second account; the effective
   * permission set is the union of the roles (see `hasUserPermission`).
   */
  roles: Role[];
};

/** Resolve the application role key from the DB role id (stable seed ids). */
export function roleNameFromId(roleId: string): Role | null {
  switch (roleId) {
    case "role-admin":
      return "admin";
    case "role-admin-officer":
      return "admin_officer";
    case "role-school-admin":
      return "school_admin";
    case "role-subject-teacher":
      return "subject_teacher";
    case "role-teacher":
      return "teacher";
    case "role-records":
      return "records";
    case "role-guidance":
      return "guidance";
    case "role-nurse":
      return "nurse";
    case "role-registrar":
      return "registrar";
    case "role-literacy-coordinator":
      return "literacy_coordinator";
    default:
      return null;
  }
}

/** DB role id → application role key (inverse of `roleNameFromId`). */
export const ROLE_KEY_TO_ID: Record<Role, string> = {
  admin: "role-admin",
  school_admin: "role-school-admin",
  subject_teacher: "role-subject-teacher",
  teacher: "role-teacher",
  records: "role-records",
  guidance: "role-guidance",
  nurse: "role-nurse",
  registrar: "role-registrar",
  literacy_coordinator: "role-literacy-coordinator",
  admin_officer: "role-admin-officer",
};

/**
 * Returns the authenticated user for the current request (deduped per render),
 * or null when unauthenticated/expired/inactive.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const tokenHash = hashToken(raw);
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      roleId: users.roleId,
      isActive: users.isActive,
      status: users.status,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  // Only an active, APPROVED account gets a session identity. Pending,
  // rejected, suspended and disabled accounts are locked out even if a stale
  // session row still exists.
  if (!row || !row.isActive || row.status !== "approved") return null;

  // Map the DB role id onto the application role key.
  const role = roleNameFromId(row.roleId);
  if (!role) return null; // unknown role ⇒ no access

  // Additional roles (Adviser + Subject Teacher, …).
  const extra = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, row.id));
  const roles: Role[] = [role];
  for (const r of extra) {
    const key = roleNameFromId(r.roleId);
    if (key && !roles.includes(key)) roles.push(key);
  }

  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    roleId: row.roleId,
    role,
    roles,
  };
});

/** Page guard: redirect to /login when unauthenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Page guard: redirect to /dashboard with a message when lacking permission.
 * The check runs over EVERY role the account holds.
 */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasUserPermission(user.roles, permission)) {
    redirect("/dashboard?denied=" + encodeURIComponent(permission));
  }
  return user;
}

/**
 * Action guard: return null instead of redirecting (actions return errors).
 * The check runs over EVERY role the account holds.
 */
export async function getAuthorizedUser(permission: Permission): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user || !hasUserPermission(user.roles, permission)) return null;
  return user;
}

/** Creates a DB-backed session and sets the secure cookie. */
export async function createSession(
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null; ttlMs?: number } = {},
): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const ttl = meta.ttlMs ?? SESSION_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl);

  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    tokenHash: hashToken(token),
    userId,
    expiresAt,
    ip: meta.ip ?? null,
    userAgent: meta.userAgent ?? null,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SESSION_COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

/**
 * Revoke every session for an account (password reset, suspension). The raw
 * cookie tokens are unrecoverable by design, so revoking the stored hashes is
 * sufficient: the next request finds no matching session.
 */
export async function revokeUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Deletes the current session and clears the cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (raw) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(raw)));
  }
  store.delete(SESSION_COOKIE_NAME);
}

/**
 * Guard against demoting/deactivating the last active administrator.
 *
 * Counts every ACTIVE account that holds the administrator role — either as
 * its primary role (`users.role_id`) or as an additional role (`user_roles`).
 */
export async function countOtherActiveAdmins(excludeUserId: string): Promise<number> {
  const rows = await db
    .select({ id: users.id, roleId: users.roleId })
    .from(users)
    // Dummy/test admins are NOT real administrators — they must never satisfy
    // the "last active administrator" guard.
    .where(and(eq(users.isActive, true), eq(users.isDummy, false)));
  const primaryAdmins = rows.filter((r) => r.id !== excludeUserId && roleNameFromId(r.roleId) === "admin");

  const extraAdmins = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(eq(userRoles.roleId, "role-admin"));
  const extraIds = new Set(extraAdmins.map((r) => r.userId));

  let count = primaryAdmins.length;
  for (const r of rows) {
    if (r.id === excludeUserId) continue;
    if (extraIds.has(r.id) && roleNameFromId(r.roleId) !== "admin") count += 1;
  }
  return count;
}
