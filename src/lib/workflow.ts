import type { ValidationStatus } from "./constants";

/**
 * Allowed workflow transitions. Any transition not listed here is rejected
 * server-side, even if reached by a direct Server-Action call.
 *
 * Practical statuses in use:
 *   draft              → record being filled in (not yet submitted)
 *   pending_validation → queued for a validator (submit/resubmit lands here)
 *   needs_correction   → returned to the collector for fixes
 *   verified           → final; locked for non-admin edits
 *
 * `submitted` and `resubmitted` are kept in the enum for compatibility, but
 * the live workflow funnels through the statuses above.
 */
export const VALIDATION_TRANSITIONS: Record<ValidationStatus, ValidationStatus[]> = {
  draft: ["pending_validation"],
  submitted: ["pending_validation", "needs_correction", "verified"],
  pending_validation: ["verified", "needs_correction"],
  needs_correction: ["pending_validation"],
  resubmitted: ["pending_validation", "verified"],
  verified: ["pending_validation"], // admin re-open only
};

export function canTransition(
  from: ValidationStatus,
  to: ValidationStatus,
  role?: string,
): boolean {
  if (from === "verified" && role === "admin") return true;
  return VALIDATION_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Whether a record may be edited by its collector right now. */
export function isEditable(status: ValidationStatus): boolean {
  return status === "draft" || status === "needs_correction";
}

/** Whether a record has reached the validation queue. */
export function isAwaitingValidation(status: ValidationStatus): boolean {
  return status === "pending_validation" || status === "submitted" || status === "resubmitted";
}