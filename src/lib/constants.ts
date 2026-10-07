/**
 * Shared domain constants for the Records Management System with Profile and
 * Performance Analytics of Sta. Magdalena National High School.
 * School-only platform — students are the central entity.
 */

export const SCHOOL = {
  name: "Sta. Magdalena National High School",
  shortName: "Sta. Magdalena NHS",
  address: "Sta. Magdalena, Sorsogon",
  province: "Province of Sorsogon",
  region: "Region V — Bicol",
} as const;

/* -------------------------------------------------------------------------- */
/*  Roles — five school roles (barangay/lgu removed with the municipality     */
/*  scope; schools users are internal personnel).                              */
/* -------------------------------------------------------------------------- */

export const ROLES = ["admin", "school_admin", "teacher", "records", "guidance"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "System Administrator",
  school_admin: "School Administrator",
  teacher: "Teacher / Adviser",
  records: "Records Personnel",
  guidance: "Guidance Personnel",
};

/* -------------------------------------------------------------------------- */
/*  Student lifecycle & record verification workflow                           */
/* -------------------------------------------------------------------------- */

export const STUDENT_STATUSES = ["active", "inactive", "archived"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
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
  pending_validation: "Pending Verification",
  needs_correction: "Needs Correction",
  verified: "Verified",
  marked_duplicate: "Marked Duplicate",
};

/* -------------------------------------------------------------------------- */
/*  Academic structure                                                         */
/* -------------------------------------------------------------------------- */

export const GRADE_LEVELS = [
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
] as const;

export const GRADING_PERIOD_NAMES = [
  "Quarter 1",
  "Quarter 2",
  "Quarter 3",
  "Quarter 4",
] as const;

export const ENROLLMENT_STATUSES = [
  "active",
  "completed",
  "transferred",
  "withdrawn",
] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  active: "Active",
  completed: "Completed",
  transferred: "Transferred",
  withdrawn: "Withdrawn",
};

/* -------------------------------------------------------------------------- */
/*  Attendance                                                                 */
/* -------------------------------------------------------------------------- */

export const ATTENDANCE_STATUSES = [
  "present",
  "absent_excused",
  "absent_unexcused",
  "late",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  absent_excused: "Absent (Excused)",
  absent_unexcused: "Absent (Unexcused)",
  late: "Late",
};

/* -------------------------------------------------------------------------- */
/*  Behavior (neutral language; categories are data rows — these are seeds)    */
/* -------------------------------------------------------------------------- */

export const BEHAVIOR_KINDS = ["positive", "concern"] as const;
export type BehaviorKind = (typeof BEHAVIOR_KINDS)[number];

export const BEHAVIOR_SEVERITIES = ["low", "medium", "high"] as const;
export type BehaviorSeverity = (typeof BEHAVIOR_SEVERITIES)[number];

export const BEHAVIOR_RECORD_STATUSES = ["open", "monitored", "resolved"] as const;
export type BehaviorRecordStatus = (typeof BEHAVIOR_RECORD_STATUSES)[number];

export const BEHAVIOR_SEED_CATEGORIES = [
  { name: "Positive Participation", kind: "positive" },
  { name: "Leadership", kind: "positive" },
  { name: "Cooperation", kind: "positive" },
  { name: "Academic Effort", kind: "positive" },
  { name: "Classroom Concern", kind: "concern" },
  { name: "Attendance-Related Concern", kind: "concern" },
  { name: "Peer Relations Concern", kind: "concern" },
] as const;

/* -------------------------------------------------------------------------- */
/*  Assessments — single engine, three domains. Levels are configurable data   */
/*  (system_settings.assessment_levels); the seeds below are placeholders,     */
/*  NOT official standards.                                                    */
/* -------------------------------------------------------------------------- */

export const ASSESSMENT_DOMAINS = ["reading", "literacy", "numeracy"] as const;
export type AssessmentDomain = (typeof ASSESSMENT_DOMAINS)[number];

export const ASSESSMENT_DOMAIN_LABELS: Record<AssessmentDomain, string> = {
  reading: "Reading",
  literacy: "Literacy",
  numeracy: "Numeracy",
};

/** Default assessment level placeholders (school-adjustable via settings). */
export const DEFAULT_ASSESSMENT_LEVELS: Record<AssessmentDomain, string[]> = {
  reading: ["Beginning", "Developing", "Approaching", "Proficient"],
  literacy: ["Beginning", "Developing", "Approaching", "Proficient"],
  numeracy: ["Beginning", "Developing", "Approaching", "Proficient"],
};

/* -------------------------------------------------------------------------- */
/*  Interventions                                                              */
/* -------------------------------------------------------------------------- */

export const INTERVENTION_STATUSES = [
  "planned",
  "active",
  "completed",
  "discontinued",
] as const;
export type InterventionStatus = (typeof INTERVENTION_STATUSES)[number];

export const INTERVENTION_STATUS_LABELS: Record<InterventionStatus, string> = {
  planned: "Planned",
  active: "Active",
  completed: "Completed",
  discontinued: "Discontinued",
};

export const FOLLOWUP_STATUSES = ["scheduled", "done", "missed", "cancelled"] as const;
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];

export const FOLLOWUP_STATUS_LABELS: Record<FollowupStatus, string> = {
  scheduled: "Scheduled",
  done: "Done",
  missed: "Missed",
  cancelled: "Cancelled",
};

export const INTERVENTION_SEED_TYPES = [
  "Academic Remediation",
  "Reading Support",
  "Numeracy Support",
  "Counseling Referral",
  "Attendance Follow-Up",
] as const;

/* -------------------------------------------------------------------------- */
/*  Verification workflow (dual convention: status on students + history rows) */
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
/*  Duplicate review                                                           */
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
/*  Reports                                                                    */
/* -------------------------------------------------------------------------- */

export const REPORT_TYPES = [
  "student_master_list",
  "enrollment_report",
  "grade_report",
  "subject_performance",
  "attendance_report",
  "behavior_report",
  "reading_report",
  "literacy_report",
  "numeracy_report",
  "intervention_report",
  "student_profile_report",
  "needs_monitoring_report",
  "grade_level_performance",
  "section_performance",
  "school_year_comparison",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  student_master_list: "Student Master List",
  enrollment_report: "Enrollment Report",
  grade_report: "Grade Report",
  subject_performance: "Subject Performance",
  attendance_report: "Attendance Report",
  behavior_report: "Behavior Summary",
  reading_report: "Reading Assessment Summary",
  literacy_report: "Literacy Assessment Summary",
  numeracy_report: "Numeracy Assessment Summary",
  intervention_report: "Intervention Summary",
  student_profile_report: "Student Profile Report",
  needs_monitoring_report: "Requires-Attention List",
  grade_level_performance: "Grade-Level Performance",
  section_performance: "Section Performance",
  school_year_comparison: "School-Year Comparison",
};

export const REPORT_SCOPES = ["school", "grade_level", "section"] as const;
export type ReportScope = (typeof REPORT_SCOPES)[number];

export const EXPORT_FORMATS = ["PDF", "XLSX", "CSV"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/* -------------------------------------------------------------------------- */
/*  Sex                                                                        */
/* -------------------------------------------------------------------------- */

export const SEXES = ["male", "female"] as const;
export type Sex = (typeof SEXES)[number];

/* -------------------------------------------------------------------------- */
/*  Session                                                                    */
/* -------------------------------------------------------------------------- */

export const SESSION_COOKIE_NAME = "sms_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

/** Statuses eligible for QR generation (verified records only). */
export const QR_ELIGIBLE_RECORD_STATUSES: RecordStatus[] = ["verified"];
