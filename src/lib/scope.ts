import { eq, or, sql, type SQL } from "drizzle-orm";
import { children } from "@/db/schema";
import type { SessionUser } from "./auth";

/**
 * Row-level scoping for child records.
 *
 * - admin / lgu  → entire municipality
 * - school       → children of the user's school, or school-less records they created
 * - barangay     → children of the user's barangay
 *
 * Used by every read *and* every write path so that authorization cannot be
 * bypassed by calling the API directly.
 */
export function childScope(user: SessionUser): SQL | undefined {
  switch (user.role) {
    case "admin":
    case "lgu":
      return undefined; // municipality-wide
    case "school":
      if (user.schoolId) {
        return or(eq(children.schoolId, user.schoolId), eq(children.createdBy, user.id));
      }
      return eq(children.createdBy, user.id);
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

/** Can this user read this child record? Used before detail views/writes. */
export function canAccessChild(
  user: SessionUser,
  child: { schoolId: string | null; barangayId: string; createdBy: string },
): boolean {
  switch (user.role) {
    case "admin":
    case "lgu":
      return true;
    case "school":
      return child.schoolId === user.schoolId || child.createdBy === user.id;
    case "barangay":
      return child.barangayId === user.barangayId || child.createdBy === user.id;
    default:
      return false;
  }
}

/** Can this user modify (edit/submit) this child record? */
export function canEditChild(
  user: SessionUser,
  child: { schoolId: string | null; barangayId: string; createdBy: string; validationStatus: string },
): boolean {
  if (!canAccessChild(user, child)) return false;
  // Verified records are locked; re-opening requires admin/lgu action.
  if (child.validationStatus === "verified" && user.role !== "admin") return false;
  return true;
}
