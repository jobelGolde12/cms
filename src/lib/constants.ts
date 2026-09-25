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

/* -------------------------------------------------------------------------- */
/*  Roles — exactly three. There is NO School User role; schools are          */
/*  reference entities only.                                                  */
/* -------------------------------------------------------------------------- */

export const ROLES = ["barangay", "lgu", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  barangay: "Barangay User",
  lgu: "LGU User",
  admin: "System Administrator",
};

/* -------------------------------------------------------------------------- */
/*  Child record workflow                                                     */
/* -------------------------------------------------------------------------- */

export const CHILD_STATUSES = ["active", "inactive", "archived"] as const;
export type ChildStatus = (typeof CHILD_STATUSES)[number];

export const CHILD_STATUS_LABELS: Record<ChildStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};

export const RECORD_STATUSES = [
  "draft",
  "pending_validation",
  "needs_correction",
  "verified",
  "marked_duplicate",
] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

export const RECORD_STATUS_LABELS: Record<RecordStatus, string> = {
  draft: "Draft",
  pending_validation: "Pending Validation",
  needs_correction: "Needs Correction",
  verified: "Verified",
  marked_duplicate: "Marked Duplicate",
};

/* -------------------------------------------------------------------------- */
/*  Education                                                                 */
/* -------------------------------------------------------------------------- */

export const EDUCATION_STATUSES = [
  "enrolled",
  "out_of_school",
  "not_yet_in_school",
  "graduated",
  "unknown",
] as const;
export type EducationStatus = (typeof EDUCATION_STATUSES)[number];

export const EDUCATION_STATUS_LABELS: Record<EducationStatus, string> = {
  enrolled: "Enrolled",
  out_of_school: "Out-of-School",
  not_yet_in_school: "Not Yet in School",
  graduated: "Graduated",
  unknown: "Unknown",
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

export const SCHOOL_TYPES = ["elementary", "high_school", "integrated", "college"] as const;
export type SchoolType = (typeof SCHOOL_TYPES)[number];

/* -------------------------------------------------------------------------- */
/*  ECCD                                                                      */
/* -------------------------------------------------------------------------- */

export const ECCD_STATUSES = ["participating", "not_participating", "unknown"] as const;
export type EccdStatus = (typeof ECCD_STATUSES)[number];

export const ECCD_STATUS_LABELS: Record<EccdStatus, string> = {
  participating: "Participating",
  not_participating: "Not Participating",
  unknown: "Unknown",
};

/* -------------------------------------------------------------------------- */
/*  Disability (sensitive)                                                    */
/* -------------------------------------------------------------------------- */

export const DISABILITY_TYPES = [
  "visual",
  "hearing",
  "physical",
  "intellectual",
  "learning",
  "speech",
  "other",
] as const;
export type DisabilityType = (typeof DISABILITY_TYPES)[number];

export const DISABILITY_TYPE_LABELS: Record<DisabilityType, string> = {
  visual: "Visual Impairment",
  hearing: "Hearing Impairment",
  physical: "Physical / Orthopedic",
  intellectual: "Intellectual Disability",
  learning: "Learning Disability",
  speech: "Speech / Language",
  other: "Other",
};

export const ASSISTANCE_STATUSES = [
  "none",
  "assessment",
  "support",
  "referred",
  "ongoing",
  "completed",
] as const;
export type AssistanceStatus = (typeof ASSISTANCE_STATUSES)[number];

/* -------------------------------------------------------------------------- */
/*  Validation workflow                                                       */
/* -------------------------------------------------------------------------- */

export const VALIDATION_STATUSES = ["pending", "approved", "needs_correction", "rejected"] as const;
export type ValidationStatus = (typeof VALIDATION_STATUSES)[number];

export const VALIDATION_STATUS_LABELS: Record<ValidationStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  needs_correction: "Needs Correction",
  rejected: "Rejected",
};

/* -------------------------------------------------------------------------- */
/*  Duplicate review                                                          */
/* -------------------------------------------------------------------------- */

export const DUPLICATE_STATUSES = [
  "pending",
  "confirmed_duplicate",
  "not_duplicate",
  "dismissed",
] as const;
export type DuplicateStatus = (typeof DUPLICATE_STATUSES)[number];

export const DUPLICATE_STATUS_LABELS: Record<DuplicateStatus, string> = {
  pending: "Pending Review",
  confirmed_duplicate: "Confirmed Duplicate",
  not_duplicate: "Not a Duplicate",
  dismissed: "Dismissed",
};

/* -------------------------------------------------------------------------- */
/*  Monitoring                                                                */
/* -------------------------------------------------------------------------- */

export const MONITORING_TYPES = [
  "education",
  "out_of_school_youth",
  "eccd",
  "disability",
  "general",
] as const;
export type MonitoringType = (typeof MONITORING_TYPES)[number];

export const MONITORING_TYPE_LABELS: Record<MonitoringType, string> = {
  education: "Educational Status",
  out_of_school_youth: "Out-of-School Youth",
  eccd: "ECCD Participation",
  disability: "Disability Support",
  general: "General Welfare",
};

export const MONITORING_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type MonitoringStatus = (typeof MONITORING_STATUSES)[number];

/* -------------------------------------------------------------------------- */
/*  Interventions                                                             */
/* -------------------------------------------------------------------------- */

export const INTERVENTION_STATUSES = ["planned", "ongoing", "completed", "cancelled"] as const;
export type InterventionStatus = (typeof INTERVENTION_STATUSES)[number];

export const INTERVENTION_STATUS_LABELS: Record<InterventionStatus, string> = {
  planned: "Planned",
  ongoing: "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const INTERVENTION_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type InterventionPriority = (typeof INTERVENTION_PRIORITIES)[number];

export const FOLLOWUP_STATUSES = ["scheduled", "done", "missed", "cancelled"] as const;
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];

export const FOLLOWUP_STATUS_LABELS: Record<FollowupStatus, string> = {
  scheduled: "Scheduled",
  done: "Done",
  missed: "Missed",
  cancelled: "Cancelled",
};

/* -------------------------------------------------------------------------- */
/*  Reports                                                                   */
/* -------------------------------------------------------------------------- */

export const REPORT_TYPES = [
  "child_registry",
  "educational_status",
  "out_of_school_youth",
  "eccd",
  "disability",
  "intervention",
  "barangay_summary",
  "municipal_summary",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  child_registry: "Child Registry",
  educational_status: "Educational Status",
  out_of_school_youth: "Out-of-School Youth",
  eccd: "ECCD Participation",
  disability: "Disability",
  intervention: "Interventions",
  barangay_summary: "Barangay Summary",
  municipal_summary: "Municipal Summary",
};

export const REPORT_SCOPES = ["municipality", "barangay", "school"] as const;
export type ReportScope = (typeof REPORT_SCOPES)[number];

export const EXPORT_FORMATS = ["PDF", "XLSX", "CSV"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/* -------------------------------------------------------------------------- */
/*  Sex                                                                       */
/* -------------------------------------------------------------------------- */

export const SEXES = ["male", "female"] as const;
export type Sex = (typeof SEXES)[number];

/* -------------------------------------------------------------------------- */
/*  Session                                                                   */
/* -------------------------------------------------------------------------- */

export const SESSION_COOKIE_NAME = "cms_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Statuses eligible for QR generation (verified records only). */
export const QR_ELIGIBLE_RECORD_STATUSES: RecordStatus[] = ["verified"];
