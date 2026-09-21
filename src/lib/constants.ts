/**
 * Shared domain constants for the Municipal Child Mapping System.
 * Municipality: Sta. Magdalena, Sorsogon (14 barangays, Sorsogon 2nd District).
 */

export const MUNICIPALITY = {
  name: "Municipality of Sta. Magdalena",
  province: "Province of Sorsogon",
  region: "Region V — Bicol",
  shortName: "Sta. Magdalena",
} as const;

export const ROLES = ["admin", "lgu", "school", "barangay"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "System Administrator",
  lgu: "LGU User",
  school: "School User",
  barangay: "Barangay User",
};

export const VALIDATION_STATUSES = [
  "draft",
  "submitted",
  "pending_validation",
  "needs_correction",
  "resubmitted",
  "verified",
] as const;
export type ValidationStatus = (typeof VALIDATION_STATUSES)[number];

export const VALIDATION_LABELS: Record<ValidationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_validation: "Pending Validation",
  needs_correction: "Needs Correction",
  resubmitted: "Resubmitted",
  verified: "Verified",
};

export const EDUCATIONAL_STATUSES = [
  "not_yet_enrolled",
  "enrolled",
  "out_of_school",
  "als_learner",
] as const;
export type EducationalStatus = (typeof EDUCATIONAL_STATUSES)[number];

export const EDUCATIONAL_LABELS: Record<EducationalStatus, string> = {
  not_yet_enrolled: "Not Yet Enrolled",
  enrolled: "Enrolled",
  out_of_school: "Out-of-School",
  als_learner: "ALS Learner",
};

export const ECCD_STATUSES = ["participating", "not_participating", "unknown"] as const;
export type EccdStatus = (typeof ECCD_STATUSES)[number];

export const ECCD_LABELS: Record<EccdStatus, string> = {
  participating: "Participating",
  not_participating: "Not Participating",
  unknown: "Unknown",
};

export const DISABILITY_STATUSES = ["none", "with_disability", "suspected"] as const;
export type DisabilityStatus = (typeof DISABILITY_STATUSES)[number];

export const DISABILITY_LABELS: Record<DisabilityStatus, string> = {
  none: "None",
  with_disability: "With Disability",
  suspected: "Suspected",
};

export const DISABILITY_TYPES = [
  "visual",
  "hearing",
  "physical",
  "intellectual",
  "learning",
  "speech",
  "other",
] as const;

export const DISABILITY_TYPE_LABELS: Record<(typeof DISABILITY_TYPES)[number], string> = {
  visual: "Visual Impairment",
  hearing: "Hearing Impairment",
  physical: "Physical / Orthopedic",
  intellectual: "Intellectual Disability",
  learning: "Learning Disability",
  speech: "Speech / Language",
  other: "Other",
};

export const SEXES = ["male", "female"] as const;
export type Sex = (typeof SEXES)[number];

export const DUPLICATE_STATUSES = ["potential", "confirmed", "dismissed", "resolved"] as const;
export type DuplicateStatus = (typeof DUPLICATE_STATUSES)[number];

export const MONITORING_CATEGORIES = [
  "osy",
  "eccd",
  "disability",
  "educational",
  "intervention",
] as const;
export type MonitoringCategory = (typeof MONITORING_CATEGORIES)[number];

export const MONITORING_LABELS: Record<MonitoringCategory, string> = {
  osy: "Out-of-School Youth",
  eccd: "ECCD Non-Participation",
  disability: "Disability Support",
  educational: "Educational Status",
  intervention: "Educational Intervention",
};

export const FOLLOWUP_STATUSES = ["open", "in_progress", "follow_up", "resolved"] as const;
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];

export const FOLLOWUP_LABELS: Record<FollowupStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  follow_up: "For Follow-up",
  resolved: "Resolved",
};

export const GRADE_LEVELS = [
  "Kinder",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
] as const;

/** Statuses eligible for QR generation (verified records only). */
export const QR_ELIGIBLE_STATUSES: ValidationStatus[] = ["verified"];

export const SESSION_COOKIE_NAME = "cms_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
