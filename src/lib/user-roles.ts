import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { userRoles } from "@/db/schema";
import { ADDITIONAL_ROLE_OPTIONS, type Role } from "./constants";
import { roleNameFromId } from "./auth";

/**
 * Additional-role helpers.
 *
 * `users.role_id` is the PRIMARY role (default workspace, badge ordering).
 * `user_roles` carries every role the account holds — the migration backfilled
 * the primary role, and this module keeps the union in sync. One teacher can
 * therefore hold BOTH the Adviser (`role-teacher`) and the Subject Teacher
 * (`role-subject-teacher`) role on a single account: the advisory permissions
 * come from one role, `grades.write` + `grades.encode` from the other, and the
 * effective permission set is the union (see `hasUserPermission`).
 */

/** Roles that may be granted IN ADDITION to an account's primary role. */
export const ADDITIONAL_ROLE_IDS = ADDITIONAL_ROLE_OPTIONS.map((o) => o.id);

export function isAdditionalRoleId(id: string): boolean {
  return (ADDITIONAL_ROLE_IDS as readonly string[]).includes(id);
}

/** Application role keys held by an account (deduped, primary first). */
export async function roleKeysForUser(
  userId: string,
  primaryRoleId: string,
): Promise<Role[]> {
  const primary = roleNameFromId(primaryRoleId);
  const roles: Role[] = primary ? [primary] : [];
  const rows = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));
  for (const row of rows) {
    const key = roleNameFromId(row.roleId);
    if (key && !roles.includes(key)) roles.push(key);
  }
  return roles;
}

/** True when the account holds `roleId` as primary OR as an extra role. */
export async function userHoldsRole(
  userId: string,
  primaryRoleId: string,
  roleId: string,
): Promise<boolean> {
  if (primaryRoleId === roleId) return true;
  const rows = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
    .limit(1);
  return rows.length > 0;
}

/** Additional role ids an account holds, excluding its primary role. */
export async function additionalRoleIdsFor(
  userId: string,
  primaryRoleId: string,
): Promise<string[]> {
  const rows = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));
  return Array.from(new Set(rows.map((r) => r.roleId))).filter(
    (id) => id !== primaryRoleId,
  );
}

/**
 * Replace the account's role rows with the union of its (possibly new)
 * primary role and the requested additional roles. Unknown / non-teaching
 * extra ids are ignored, so this helper can never grant administrative roles.
 */
export async function syncAdditionalRoles(
  userId: string,
  primaryRoleId: string,
  requested: readonly string[],
): Promise<{ added: string[]; removed: string[] }> {
  const desired = new Set<string>([primaryRoleId]);
  for (const id of requested) {
    if (isAdditionalRoleId(id) && id !== primaryRoleId) desired.add(id);
  }

  const current = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));
  const currentIds = new Set(current.map((r) => r.roleId));

  const added = [...desired].filter((id) => !currentIds.has(id));
  const removed = [...currentIds].filter((id) => !desired.has(id));

  if (removed.length > 0) {
    await db
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          inArray(userRoles.roleId, removed),
        ),
      );
  }
  if (added.length > 0) {
    await db.insert(userRoles).values(
      added.map((roleId) => ({ userId, roleId })),
    );
  }
  return { added, removed };
}

/**
 * Make sure an account holds a role (used by the assignment actions: the
 * assignment is the source of truth, and the role it implies is granted so the
 * permission gate matches the assignment). Idempotent.
 */
export async function ensureUserRole(userId: string, roleId: string): Promise<boolean> {
  const rows = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
    .limit(1);
  if (rows.length > 0) return false;
  await db.insert(userRoles).values({ userId, roleId });
  return true;
}
