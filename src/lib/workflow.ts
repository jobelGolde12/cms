import type { RecordStatus, ValidationStatus } from "./constants";

/**
 * Mapping between the child's `record_status` (single current state on the
 * `children` row) and the validation workflow records in
 * `child_validations` (full history, statuses pending/approved/…).
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

/** Allowed record_status transitions. */
export const RECORD_STATUS_TRANSITIONS: Record<RecordStatus, RecordStatus[]> = {
  draft: ["pending_validation"],
  pending_validation: ["verified", "needs_correction", "marked_duplicate"],
  needs_correction: ["pending_validation"],
  verified: ["pending_validation"], // admin re-open only
  marked_duplicate: [], // terminal; restored only by duplicate review
};

export function canTransition(from: RecordStatus, to: RecordStatus, role?: string): boolean {
  if (from === "verified" && role === "admin") return true;
  return RECORD_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Whether a record may be edited by its collector right now. */
export function isEditable(status: RecordStatus): boolean {
  return status === "draft" || status === "needs_correction";
}

/** Whether a record is in the validation queue. */
export function isAwaitingValidation(status: RecordStatus): boolean {
  return status === "pending_validation";
}
