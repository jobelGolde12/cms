import type { RecordStatus, ValidationStatus } from "./constants";

/**
 * Mapping between the student's `record_status` (single current state on the
 * `students` row) and the verification workflow records (full history,
 * statuses pending/approved/…).
 *
 * Workflow:
 *   draft → pending_validation → verified
 *                    ↓
 *            needs_correction → pending_validation (resubmit)
 *
 * Any transition not allowed here is rejected server-side.
 */

const RECORD_TO_VALIDATION: Record<RecordStatus, ValidationStatus> = {
  draft: "pending",
  pending_validation: "pending",
  needs_correction: "needs_correction",
  verified: "approved",
  marked_duplicate: "rejected",
};

export function validationStatusFor(record: RecordStatus): ValidationStatus {
  return RECORD_TO_VALIDATION[record];
}

/** Allowed record_status transitions (role-gated rules in canTransition). */
export const RECORD_STATUS_TRANSITIONS: Record<RecordStatus, RecordStatus[]> = {
  draft: ["pending_validation"],
  pending_validation: ["verified", "needs_correction", "marked_duplicate"],
  needs_correction: ["pending_validation"],
  // Re-opening a verified record is admin-only — enforced by the role check in
  // canTransition (and re-checked in the reopen action).
  verified: [],
  marked_duplicate: [], // terminal; restored only by duplicate review
};

/**
 * Reviewer decision (from `verificationReviewSchema`) → the resulting
 * `students.record_status`.
 *
 * `rejected` is a verification-history status only — it is NOT a legal
 * `students.record_status`. A hard reject of a queued record marks it
 * `marked_duplicate` (the terminal status allowed by RECORD_STATUS_TRANSITIONS),
 * while the history row keeps `rejected` to preserve the reviewer's intent.
 */
export const REVIEW_DECISION_TO_RECORD_STATUS: Record<
  "approved" | "needs_correction" | "rejected",
  RecordStatus
> = {
  approved: "verified",
  needs_correction: "needs_correction",
  rejected: "marked_duplicate",
};

export function canTransition(from: RecordStatus, to: RecordStatus, role?: string): boolean {
  // Re-opening a verified record requires an administrator (documented rule).
  if (from === "verified") return role === "admin" && to === "pending_validation";
  return RECORD_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Whether a record may be edited by its creator right now. */
export function isEditable(status: RecordStatus): boolean {
  return status === "draft" || status === "needs_correction";
}

/** Whether a record is in the verification queue. */
export function isAwaitingVerification(status: RecordStatus): boolean {
  return status === "pending_validation";
}
