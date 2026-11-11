/**
 * Shared domain constants for the Records Management System with Profile and
 * Performance Analytics of Sta. Magdalena National High School.
 * School-only platform — students are the central entity.
 */

export const SCHOOL = {
  name: "Sta. Magdalena National High School",
  shortName: "Sta. Magdalena National High School",
  address: "Sta. Magdalena, Sorsogon",
  province: "Province of Sorsogon",
  region: "Region V — Bicol",
} as const;

/* -------------------------------------------------------------------------- */
/*  Roles — ten school roles (barangay/lgu removed with the municipality       */
/*  scope; schools users are internal personnel).                              */
/* -------------------------------------------------------------------------- */

export const ROLES = [
  "admin",
  "school_admin",
  "subject_teacher",
  "teacher",
  "records",
  "guidance",
  "nurse",
  "registrar",
  "literacy_coordinator",
  "admin_officer",
] as const;
export type Role = (typeof ROLES)[number];

/**
 * Account lifecycle. Self-registered accounts start `pending` and cannot sign
 * in until an administrator approves them and assigns a role. `suspended` and
 * `disabled` revoke access without deleting the account or its history.
 */
export const ACCOUNT_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "suspended",
  "disabled",
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
  disabled: "Disabled",
};

/**
 * Placeholder role for a self-registered account awaiting review. It holds no
 * permissions and is intentionally unknown to `roleNameFromId`, so even a
 * status-check bypass cannot grant access.
 */
export const PENDING_ROLE_ID = "role-pending";

/** Positions an applicant may request (never an application role). */
export const REGISTRATION_POSITIONS = [
  "teacher",
  "subject_teacher",
  "adviser",
  "administrative_staff",
  "other",
] as const;
export type RegistrationPosition = (typeof REGISTRATION_POSITIONS)[number];

export const REGISTRATION_POSITION_LABELS: Record<RegistrationPosition, string> = {
  teacher: "Teacher",
  subject_teacher: "Subject Teacher",
  adviser: "Adviser",
  administrative_staff: "Administrative Staff",
  other: "Other school personnel",
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "System Administrator",
  school_admin: "School Administrator",
  subject_teacher: "Subject Teacher",
  teacher: "Adviser",
  records: "Records Personnel",
  guidance: "Guidance Counselor",
  nurse: "Nurse",
  registrar: "Registrar",
  literacy_coordinator: "Language & Literacy Coordinator",
  admin_officer: "Admin Officer",
};

/**
 * Human label for the role set an account holds. One teacher can be both an
 * Adviser and a Subject Teacher, so the badge lists every role — e.g.
 * "Adviser + Subject Teacher".
 */
export function roleLabelsFor(roles: readonly Role[]): string {
  if (roles.length === 0) return "—";
  return roles.map((r) => ROLE_LABELS[r]).join(" + ");
}

/**
 * Teaching roles that may be granted IN ADDITION to an account's primary role.
 *
 * A teacher is frequently both an Adviser and a Subject Teacher; the account
 * carries both roles (see `user_roles`) instead of duplicating the employee.
 */
export const ADDITIONAL_ROLE_OPTIONS = [
  { id: "role-teacher", label: ROLE_LABELS.teacher },
  { id: "role-subject-teacher", label: ROLE_LABELS.subject_teacher },
] as const;

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

/**
 * Active grading periods of a school year.
 *
 * The school runs THREE terms (DepEd senior high school grading — Terms 1, 2
 * and 3). There is deliberately NO fourth period: the former "Quarter 1–4"
 * vocabulary was replaced by terms in the 2026-11 revision.
 */
export const GRADING_PERIOD_NAMES = [
  "TERM 1",
  "TERM 2",
  "TERM 3",
] as const;

/** Number of active grading periods per school year (3 terms — never 4). */
export const GRADING_PERIOD_COUNT = GRADING_PERIOD_NAMES.length;

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
  // Guidance Office incident types (data rows — the Guidance Counselor can
  // request new types from the admin; nothing here is hard-coded in logic).
  { name: "Bullying", kind: "concern" },
  { name: "Fighting / Riot", kind: "concern" },
  { name: "Physical Altercation", kind: "concern" },
  { name: "Verbal Abuse", kind: "concern" },
  { name: "Harassment", kind: "concern" },
  { name: "Threatening Behavior", kind: "concern" },
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

/* -------------------------------------------------------------------------- */
/*  Health — nutritional status & clinical records (Nurse domain)              */
/* -------------------------------------------------------------------------- */

export const NUTRITIONAL_STATUSES = [
  "normal",
  "wasted",
  "severely_wasted",
  "overweight",
  "obese",
] as const;
export type NutritionalStatus = (typeof NUTRITIONAL_STATUSES)[number];

export const NUTRITIONAL_STATUS_LABELS: Record<NutritionalStatus, string> = {
  normal: "Normal",
  wasted: "Wasted",
  severely_wasted: "Severely Wasted",
  overweight: "Overweight",
  obese: "Obese",
};

export const HEIGHT_FOR_AGE_STATUSES = [
  "normal",
  "stunted",
  "severely_stunted",
  "tall",
] as const;
export type HeightForAgeStatus = (typeof HEIGHT_FOR_AGE_STATUSES)[number];

export const HEIGHT_FOR_AGE_LABELS: Record<HeightForAgeStatus, string> = {
  normal: "Normal",
  stunted: "Stunted",
  severely_stunted: "Severely Stunted",
  tall: "Tall",
};

export const HEALTH_SEED_CATEGORIES = [
  "Health Assessment",
  "First Aid",
  "Referral",
  "Health Education",
] as const;

export const ASSESSMENT_TYPE_PRESETS = [
  "Phil-IRI",
  "Reading Assessment",
  "Literacy Assessment",
  "Numeracy Assessment",
] as const;

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
/*  Employees — Admin Officer domain (strictly isolated from student data)     */
/* -------------------------------------------------------------------------- */

export const EMPLOYEE_STATUSES = ["active", "inactive", "archived"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};

export const APPOINTMENT_STATUSES = [
  "permanent",
  "provisional",
  "casual",
  "contractual",
  "substitute",
  "part_time",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  permanent: "Permanent",
  provisional: "Provisional",
  casual: "Casual",
  contractual: "Contractual",
  substitute: "Substitute",
  part_time: "Part-Time",
};

export const EMPLOYMENT_TYPES = ["teaching", "non_teaching", "support"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  teaching: "Teaching",
  non_teaching: "Non-Teaching",
  support: "Support",
};

/**
 * Employee position — CONTROLLED vocabulary (admin-selectable dropdown, never
 * free text). Distinct from the system login Role: a position describes the
 * employee's school job; `users.roleId` describes application permissions.
 * A legacy non-vocabulary value (pre-2026-11 rows) is surfaced through the
 * `other` option with the original text preserved in `otherPosition`.
 */
export const EMPLOYEE_POSITIONS = [
  "school_administrator",
  "adviser",
  "adviser_subject_teacher",
  "subject_teacher",
  "teacher",
  "guidance_counselor",
  "nurse",
  "registrar",
  "administrative_staff",
  "other",
] as const;
export type EmployeePosition = (typeof EMPLOYEE_POSITIONS)[number];

export const EMPLOYEE_POSITION_LABELS: Record<EmployeePosition, string> = {
  school_administrator: "School Administrator",
  adviser: "Adviser",
  adviser_subject_teacher: "Adviser + Subject Teacher",
  subject_teacher: "Subject Teacher",
  teacher: "Teacher",
  guidance_counselor: "Guidance Counselor",
  nurse: "Nurse",
  registrar: "Registrar",
  administrative_staff: "Administrative Staff",
  other: "Other (specify)",
};

/** Positions that require a section assignment (drives the dynamic form). */
export const SECTION_ASSIGNMENT_POSITIONS: EmployeePosition[] = [
  "adviser",
  "adviser_subject_teacher",
];

export const CIVIL_STATUSES = [
  "single",
  "married",
  "widowed",
  "separated",
  "annulled",
] as const;
export type CivilStatus = (typeof CIVIL_STATUSES)[number];

export const CIVIL_STATUS_LABELS: Record<CivilStatus, string> = {
  single: "Single",
  married: "Married",
  widowed: "Widowed",
  separated: "Separated",
  annulled: "Annulled",
};

/** 201 File document categories (DepEd personnel-document conventions). */
export const EMPLOYEE_201_CATEGORIES = [
  "personal_information",
  "appointment",
  "eligibility",
  "training",
  "performance",
  "leave",
  "government",
  "certificate",
  "memorandum",
  "other",
] as const;
export type Employee201Category = (typeof EMPLOYEE_201_CATEGORIES)[number];

export const EMPLOYEE_201_CATEGORY_LABELS: Record<Employee201Category, string> = {
  personal_information: "Personal Information",
  appointment: "Appointment / Employment Records",
  eligibility: "Eligibility Documents",
  training: "Training and Seminars",
  performance: "Performance Records",
  leave: "Leave Records",
  government: "Government Documents",
  certificate: "Certificates",
  memorandum: "Memoranda",
  other: "Other Personnel Documents",
};

export const SERVICE_CREDIT_TYPES = ["earned", "consumed"] as const;
export type ServiceCreditType = (typeof SERVICE_CREDIT_TYPES)[number];

export const SERVICE_CREDIT_TYPE_LABELS: Record<ServiceCreditType, string> = {
  earned: "Earned",
  consumed: "Consumed",
};

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

/** Short-lived second-factor challenge cookie (MFA pending, not a session). */
export const MFA_CHALLENGE_COOKIE_NAME = "sms_mfa";
export const MFA_CHALLENGE_TTL_MS = 10 * 60 * 1000; // 10 minutes
/** Maximum wrong codes tolerated before the challenge is discarded. */
export const MFA_MAX_ATTEMPTS = 5;

/** Password reset token lifetime (30 minutes). */
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

/** Grade-submission health statuses (server-evaluated, Asia/Manila). */
export const GRADE_SUBMISSION_STATUSES = [
  "not_yet_due",
  "submitted",
  "submitted_on_time",
  "submitted_late",
  "overdue",
  "missing",
] as const;
export type GradeSubmissionStatus = (typeof GRADE_SUBMISSION_STATUSES)[number];

export const GRADE_SUBMISSION_STATUS_LABELS: Record<GradeSubmissionStatus, string> = {
  not_yet_due: "Not Yet Due",
  submitted: "Submitted",
  submitted_on_time: "Submitted On Time",
  submitted_late: "Submitted Late",
  overdue: "Overdue",
  missing: "Missing",
};

/** School timezone for authoritative deadline calculations. */
export const SCHOOL_TIMEZONE = "Asia/Manila";

/** Statuses eligible for QR generation (verified records only). */
export const QR_ELIGIBLE_RECORD_STATUSES: RecordStatus[] = ["verified"];
