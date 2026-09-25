import { eq, or, sql, type SQL } from "drizzle-orm";
import { children } from "@/db/schema";
import type { SessionUser } from "./auth";

/**
 * Row-level scoping for child records.
 *
 * - admin / lgu  → entire municipality
 * - barangay     → children of the user's barangay (or ones they created,
 *                  covering records logged before a barangay was assigned)
 *
 * Used by every read *and* every write path so that authorization cannot be
 * bypassed by calling the API directly.
 */
export function childScope(user: SessionUser): SQL | undefined {
  switch (user.role) {
    case "admin":
    case "lgu":
      return undefined; // municipality-wide
    case "barangay":
      if (user.barangayId) {
        return or(
          eq(children.barangayId, user.barangayId),
          eq(children.createdBy, user.id),
        );
      }
      return eq(children.createdBy, user.id);
    default:
      // Unknown roles see nothing.
      return sql`1 = 0`;
  }
}

export type ChildScopeRef = {
  barangayId: string;
  createdBy: string;
};

/** Can this user read this child record? Used before detail views/writes. */
export function canAccessChild(user: SessionUser, child: ChildScopeRef): boolean {
  switch (user.role) {
    case "admin":
    case "lgu":
      return true;
    case "barangay":
      return child.barangayId === user.barangayId || child.createdBy === user.id;
    default:
      return false;
  }
}

/** Can this user modify (edit/submit) this child record? */
export function canEditChild(
  user: SessionUser,
  child: ChildScopeRef & { recordStatus: string },
): boolean {
  if (!canAccessChild(user, child)) return false;
  // Verified records are locked; re-opening requires admin action.
  if (child.recordStatus === "verified" && user.role !== "admin") return false;
  return true;
}
