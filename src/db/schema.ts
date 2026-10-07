import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/* -------------------------------------------------------------------------- */
/*  Shared helpers                                                            */
/* -------------------------------------------------------------------------- */

const timestamp = (name: string) => integer(name, { mode: "timestamp" });

/** Simple boolean column (SQLite stores 0/1). */
const bool = (name: string) => integer(name, { mode: "boolean" });

/* -------------------------------------------------------------------------- */
/*  User management                                                           */
/* -------------------------------------------------------------------------- */

export const roles = sqliteTable(
  "roles",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("roles_name_uq").on(t.name)],
);

export const permissions = sqliteTable(
  "permissions",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    module: text("module").notNull(),
    action: text("action").notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("permissions_name_uq").on(t.name)],
);

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    primaryKey({ columns: [t.roleId, t.permissionId] }),
    index("role_permissions_role_idx").on(t.roleId),
    index("role_permissions_permission_idx").on(t.permissionId),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Users & sessions                                                          */
/* -------------------------------------------------------------------------- */

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id),
    firstName: text("first_name").notNull(),
    middleName: text("middle_name"),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    phone: text("phone"),
    isActive: bool("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(t.email),
    index("users_email_idx").on(t.email),
    index("users_role_idx").on(t.roleId),
    index("users_active_idx").on(t.isActive),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    /** SHA-256 of the opaque cookie token. The raw token is never stored. */
    tokenHash: text("token_hash").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_uq").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Academic structure                                                        */
/* -------------------------------------------------------------------------- */

export const schoolYears = sqliteTable(
  "school_years",
  {
    id: text("id").primaryKey(),
    /** YYYY-YYYY */
    year: text("year").notNull(),
    startDate: text("start_date"),
    endDate: text("end_date"),
    isCurrent: bool("is_current").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("school_years_year_uq").on(t.year),
    index("school_years_current_idx").on(t.isCurrent),
  ],
);

export const gradeLevels = sqliteTable(
  "grade_levels",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    orderIndex: integer("order_index").notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("grade_levels_name_uq").on(t.name),
    index("grade_levels_order_idx").on(t.orderIndex),
  ],
);

export const sections = sqliteTable(
  "sections",
  {
    id: text("id").primaryKey(),
    schoolYearId: text("school_year_id")
      .notNull()
      .references(() => schoolYears.id),
    gradeLevelId: text("grade_level_id")
      .notNull()
      .references(() => gradeLevels.id),
    name: text("name").notNull(),
    adviserId: text("adviser_id").references(() => users.id, { onDelete: "set null" }),
    isActive: bool("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("sections_sy_grade_name_uq").on(t.schoolYearId, t.gradeLevelId, t.name),
    index("sections_sy_idx").on(t.schoolYearId),
    index("sections_grade_idx").on(t.gradeLevelId),
    index("sections_adviser_idx").on(t.adviserId),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Students (central entity) & guardians                                     */
/* -------------------------------------------------------------------------- */

export const students = sqliteTable(
  "students",
  {
    id: text("id").primaryKey(),
    /** Application-generated stable public identifier, e.g. SM-2026-000001. */
    studentNumber: text("student_number").notNull(),

    firstName: text("first_name").notNull(),
    middleName: text("middle_name"),
    lastName: text("last_name").notNull(),
    suffix: text("suffix"),
    birthDate: text("birth_date").notNull(), // ISO date YYYY-MM-DD
    /** male | female */
    sex: text("sex").notNull(),

    contactNumber: text("contact_number"),
    address: text("address"),

    /** active | inactive | archived */
    status: text("status").notNull().default("active"),
    /** draft | pending_validation | needs_correction | verified | marked_duplicate */
    recordStatus: text("record_status").notNull().default("draft"),

    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    updatedBy: text("updated_by").references(() => users.id),

    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("students_number_uq").on(t.studentNumber),
    index("students_last_name_idx").on(t.lastName),
    index("students_first_name_idx").on(t.firstName),
    index("students_birth_idx").on(t.birthDate),
    index("students_status_idx").on(t.status),
    index("students_record_status_idx").on(t.recordStatus),
    index("students_created_idx").on(t.createdAt),
  ],
);

export const guardians = sqliteTable(
  "guardians",
  {
    id: text("id").primaryKey(),
    firstName: text("first_name").notNull(),
    middleName: text("middle_name"),
    lastName: text("last_name").notNull(),
    /** mother | father | guardian (configurable vocabulary) */
    relationship: text("relationship").notNull(),
    contactNumber: text("contact_number"),
    email: text("email"),
    occupation: text("occupation"),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    index("guardians_last_name_idx").on(t.lastName),
    index("guardians_first_name_idx").on(t.firstName),
  ],
);

export const studentGuardians = sqliteTable(
  "student_guardians",
  {
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    guardianId: text("guardian_id")
      .notNull()
      .references(() => guardians.id, { onDelete: "cascade" }),
    isPrimary: bool("is_primary").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    primaryKey({ columns: [t.studentId, t.guardianId] }),
    index("student_guardians_guardian_idx").on(t.guardianId),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Enrollment                                                                */
/* -------------------------------------------------------------------------- */

export const studentEnrollments = sqliteTable(
  "student_enrollments",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    schoolYearId: text("school_year_id")
      .notNull()
      .references(() => schoolYears.id),
    gradeLevelId: text("grade_level_id")
      .notNull()
      .references(() => gradeLevels.id),
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id),
    /** active | completed | transferred | withdrawn */
    status: text("status").notNull().default("active"),
    enrollmentDate: text("enrollment_date"),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("enrollment_student_sy_uq").on(t.studentId, t.schoolYearId),
    index("enrollments_student_idx").on(t.studentId),
    index("enrollments_sy_idx").on(t.schoolYearId),
    index("enrollments_grade_idx").on(t.gradeLevelId),
    index("enrollments_section_idx").on(t.sectionId),
    index("enrollments_status_idx").on(t.status),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Academic records                                                          */
/* -------------------------------------------------------------------------- */

export const subjects = sqliteTable(
  "subjects",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isActive: bool("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("subjects_code_uq").on(t.code),
    index("subjects_active_idx").on(t.isActive),
  ],
);

export const gradingPeriods = sqliteTable(
  "grading_periods",
  {
    id: text("id").primaryKey(),
    schoolYearId: text("school_year_id")
      .notNull()
      .references(() => schoolYears.id),
    name: text("name").notNull(),
    orderIndex: integer("order_index").notNull(),
    startDate: text("start_date"),
    endDate: text("end_date"),
    isCurrent: bool("is_current").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("grading_periods_sy_name_uq").on(t.schoolYearId, t.name),
    index("grading_periods_sy_idx").on(t.schoolYearId),
    index("grading_periods_current_idx").on(t.isCurrent),
  ],
);

export const studentGrades = sqliteTable(
  "student_grades",
  {
    id: text("id").primaryKey(),
    enrollmentId: text("enrollment_id")
      .notNull()
      .references(() => studentEnrollments.id, { onDelete: "cascade" }),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id),
    gradingPeriodId: text("grading_period_id")
      .notNull()
      .references(() => gradingPeriods.id),
    grade: real("grade").notNull(),
    remarks: text("remarks"),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("grades_enrollment_subject_period_uq").on(
      t.enrollmentId,
      t.subjectId,
      t.gradingPeriodId,
    ),
    index("grades_enrollment_idx").on(t.enrollmentId),
    index("grades_subject_idx").on(t.subjectId),
    index("grades_period_idx").on(t.gradingPeriodId),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Attendance                                                                */
/* -------------------------------------------------------------------------- */

export const attendanceRecords = sqliteTable(
  "attendance_records",
  {
    id: text("id").primaryKey(),
    enrollmentId: text("enrollment_id")
      .notNull()
      .references(() => studentEnrollments.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // ISO date YYYY-MM-DD
    /** present | absent_excused | absent_unexcused | late */
    status: text("status").notNull(),
    remarks: text("remarks"),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("attendance_enrollment_date_uq").on(t.enrollmentId, t.date),
    index("attendance_date_idx").on(t.date),
    index("attendance_status_idx").on(t.status),
    index("attendance_enrollment_idx").on(t.enrollmentId),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Behavior                                                                  */
/* -------------------------------------------------------------------------- */

export const behaviorCategories = sqliteTable(
  "behavior_categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    /** positive | concern */
    kind: text("kind").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("behavior_categories_name_uq").on(t.name)],
);

export const behaviorRecords = sqliteTable(
  "behavior_records",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => behaviorCategories.id),
    date: text("date").notNull(),
    description: text("description").notNull(),
    /** low | medium | high (concerns; optional) */
    severity: text("severity"),
    followUp: text("follow_up"),
    /** open | monitored | resolved */
    status: text("status").notNull().default("open"),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    index("behavior_student_idx").on(t.studentId),
    index("behavior_category_idx").on(t.categoryId),
    index("behavior_date_idx").on(t.date),
    index("behavior_status_idx").on(t.status),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Assessments — reading / literacy / numeracy (single engine)               */
/* -------------------------------------------------------------------------- */

export const assessments = sqliteTable(
  "assessments",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    /** reading | literacy | numeracy */
    domain: text("domain").notNull(),
    assessmentType: text("assessment_type"),
    skillArea: text("skill_area"),
    date: text("date").notNull(),
    /** configurable proficiency label (system_settings.assessment_levels) */
    level: text("level"),
    score: real("score"),
    assessorId: text("assessor_id")
      .notNull()
      .references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    index("assessments_student_domain_idx").on(t.studentId, t.domain),
    index("assessments_domain_idx").on(t.domain),
    index("assessments_date_idx").on(t.date),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Verification & duplicates                                                 */
/* -------------------------------------------------------------------------- */

export const recordVerifications = sqliteTable(
  "record_verifications",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    submittedBy: text("submitted_by")
      .notNull()
      .references(() => users.id),
    reviewedBy: text("reviewed_by").references(() => users.id),
    /** pending | approved | needs_correction | rejected */
    status: text("status").notNull().default("pending"),
    remarks: text("remarks"),
    submittedAt: timestamp("submitted_at").notNull(),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    index("verifications_student_idx").on(t.studentId),
    index("verifications_status_idx").on(t.status),
    index("verifications_submitted_idx").on(t.submittedAt),
  ],
);

export const duplicateCandidates = sqliteTable(
  "duplicate_candidates",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    possibleStudentId: text("possible_student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    matchScore: integer("match_score"),
    matchReason: text("match_reason"),
    /** pending | confirmed_duplicate | not_duplicate | dismissed */
    status: text("status").notNull().default("pending"),
    reviewedBy: text("reviewed_by").references(() => users.id),
    reviewNotes: text("review_notes"),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("duplicate_pair_uq").on(t.studentId, t.possibleStudentId),
    index("duplicate_status_idx").on(t.status),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Interventions                                                             */
/* -------------------------------------------------------------------------- */

export const interventions = sqliteTable(
  "interventions",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    interventionType: text("intervention_type").notNull(),
    description: text("description").notNull(),
    /** planned | active | completed | discontinued */
    status: text("status").notNull().default("planned"),
    outcome: text("outcome"),
    startDate: text("start_date"),
    targetDate: text("target_date"),
    completedDate: text("completed_date"),
    assignedTo: text("assigned_to").references(() => users.id),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    index("interventions_student_idx").on(t.studentId),
    index("interventions_status_idx").on(t.status),
    index("interventions_target_idx").on(t.targetDate),
  ],
);

export const interventionFollowups = sqliteTable(
  "intervention_followups",
  {
    id: text("id").primaryKey(),
    interventionId: text("intervention_id")
      .notNull()
      .references(() => interventions.id, { onDelete: "cascade" }),
    followUpDate: text("follow_up_date").notNull(),
    /** scheduled | done | missed | cancelled */
    status: text("status").notNull().default("scheduled"),
    notes: text("notes"),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [index("intervention_followups_intervention_idx").on(t.interventionId)],
);

/* -------------------------------------------------------------------------- */
/*  QR verification                                                           */
/* -------------------------------------------------------------------------- */

export const qrVerifications = sqliteTable(
  "qr_verifications",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    verificationToken: text("verification_token").notNull(),
    verifiedBy: text("verified_by").references(() => users.id),
    /** generate | scan | revoke */
    verificationType: text("verification_type").notNull(),
    /** valid | invalid | expired | revoked */
    result: text("result").notNull().default("valid"),
    verifiedAt: timestamp("verified_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (t) => [
    uniqueIndex("qr_verifications_token_uq").on(t.verificationToken),
    index("qr_verifications_student_idx").on(t.studentId),
    index("qr_verifications_verified_at_idx").on(t.verifiedAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Reporting                                                                 */
/* -------------------------------------------------------------------------- */

export const reports = sqliteTable(
  "reports",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    reportType: text("report_type").notNull(),
    generatedBy: text("generated_by")
      .notNull()
      .references(() => users.id),
    /** school | grade_level | section */
    scope: text("scope").notNull().default("school"),
    filtersJson: text("filters_json").notNull().default("{}"),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    index("reports_type_idx").on(t.reportType),
    index("reports_created_idx").on(t.createdAt),
  ],
);

export const reportExports = sqliteTable(
  "report_exports",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    /** PDF | XLSX | CSV */
    format: text("format").notNull(),
    fileReference: text("file_reference").notNull(),
    generatedBy: text("generated_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    expiresAt: timestamp("expires_at"),
  },
  (t) => [
    index("report_exports_report_idx").on(t.reportId),
    index("report_exports_generated_idx").on(t.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*  System (retained from previous schema)                                    */
/* -------------------------------------------------------------------------- */

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message"),
    link: text("link"),
    isRead: bool("is_read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    readAt: timestamp("read_at"),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.isRead)],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    /** Append-only. Namespaced action, e.g. student.create, auth.login */
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    oldValuesJson: text("old_values_json"),
    newValuesJson: text("new_values_json"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    index("audit_user_idx").on(t.userId),
    index("audit_entity_idx").on(t.entityType, t.entityId),
    index("audit_created_idx").on(t.createdAt),
  ],
);

export const systemSettings = sqliteTable(
  "system_settings",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    value: text("value").notNull(),
    description: text("description"),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("system_settings_key_uq").on(t.key)],
);

/* -------------------------------------------------------------------------- */
/*  Relations (for typed relational queries)                                  */
/* -------------------------------------------------------------------------- */

export const roleRelations = relations(roles, ({ many }) => ({
  users: many(users),
  rolePermissions: many(rolePermissions),
}));

export const permissionRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  sessions: many(sessions),
  advisedSections: many(sections),
}));

export const schoolYearRelations = relations(schoolYears, ({ many }) => ({
  sections: many(sections),
  gradingPeriods: many(gradingPeriods),
  enrollments: many(studentEnrollments),
}));

export const gradeLevelRelations = relations(gradeLevels, ({ many }) => ({
  sections: many(sections),
  enrollments: many(studentEnrollments),
}));

export const sectionRelations = relations(sections, ({ one, many }) => ({
  schoolYear: one(schoolYears, {
    fields: [sections.schoolYearId],
    references: [schoolYears.id],
  }),
  gradeLevel: one(gradeLevels, {
    fields: [sections.gradeLevelId],
    references: [gradeLevels.id],
  }),
  adviser: one(users, { fields: [sections.adviserId], references: [users.id] }),
  enrollments: many(studentEnrollments),
}));

export const studentRelations = relations(students, ({ one, many }) => ({
  createdByUser: one(users, { fields: [students.createdBy], references: [users.id] }),
  updatedByUser: one(users, { fields: [students.updatedBy], references: [users.id] }),
  enrollments: many(studentEnrollments),
  guardians: many(studentGuardians),
  behaviorRecords: many(behaviorRecords),
  assessments: many(assessments),
  interventions: many(interventions),
  verifications: many(recordVerifications),
  qrEvents: many(qrVerifications),
}));

export const guardianRelations = relations(guardians, ({ many }) => ({
  students: many(studentGuardians),
}));

export const studentGuardianRelations = relations(studentGuardians, ({ one }) => ({
  student: one(students, { fields: [studentGuardians.studentId], references: [students.id] }),
  guardian: one(guardians, { fields: [studentGuardians.guardianId], references: [guardians.id] }),
}));

export const enrollmentRelations = relations(studentEnrollments, ({ one, many }) => ({
  student: one(students, { fields: [studentEnrollments.studentId], references: [students.id] }),
  schoolYear: one(schoolYears, {
    fields: [studentEnrollments.schoolYearId],
    references: [schoolYears.id],
  }),
  gradeLevel: one(gradeLevels, {
    fields: [studentEnrollments.gradeLevelId],
    references: [gradeLevels.id],
  }),
  section: one(sections, { fields: [studentEnrollments.sectionId], references: [sections.id] }),
  recorder: one(users, { fields: [studentEnrollments.recordedBy], references: [users.id] }),
  grades: many(studentGrades),
  attendance: many(attendanceRecords),
}));

export const subjectRelations = relations(subjects, ({ many }) => ({
  grades: many(studentGrades),
}));

export const gradingPeriodRelations = relations(gradingPeriods, ({ one, many }) => ({
  schoolYear: one(schoolYears, {
    fields: [gradingPeriods.schoolYearId],
    references: [schoolYears.id],
  }),
  grades: many(studentGrades),
}));

export const gradeRelations = relations(studentGrades, ({ one }) => ({
  enrollment: one(studentEnrollments, {
    fields: [studentGrades.enrollmentId],
    references: [studentEnrollments.id],
  }),
  subject: one(subjects, { fields: [studentGrades.subjectId], references: [subjects.id] }),
  gradingPeriod: one(gradingPeriods, {
    fields: [studentGrades.gradingPeriodId],
    references: [gradingPeriods.id],
  }),
  recorder: one(users, { fields: [studentGrades.recordedBy], references: [users.id] }),
}));

export const attendanceRelations = relations(attendanceRecords, ({ one }) => ({
  enrollment: one(studentEnrollments, {
    fields: [attendanceRecords.enrollmentId],
    references: [studentEnrollments.id],
  }),
  recorder: one(users, { fields: [attendanceRecords.recordedBy], references: [users.id] }),
}));

export const behaviorCategoryRelations = relations(behaviorCategories, ({ many }) => ({
  records: many(behaviorRecords),
}));

export const behaviorRecordRelations = relations(behaviorRecords, ({ one }) => ({
  student: one(students, { fields: [behaviorRecords.studentId], references: [students.id] }),
  category: one(behaviorCategories, {
    fields: [behaviorRecords.categoryId],
    references: [behaviorCategories.id],
  }),
  recorder: one(users, { fields: [behaviorRecords.recordedBy], references: [users.id] }),
}));

export const assessmentRelations = relations(assessments, ({ one }) => ({
  student: one(students, { fields: [assessments.studentId], references: [students.id] }),
  assessor: one(users, { fields: [assessments.assessorId], references: [users.id] }),
}));

export const verificationRelations = relations(recordVerifications, ({ one }) => ({
  student: one(students, { fields: [recordVerifications.studentId], references: [students.id] }),
  submitter: one(users, { fields: [recordVerifications.submittedBy], references: [users.id] }),
  reviewer: one(users, { fields: [recordVerifications.reviewedBy], references: [users.id] }),
}));

export const duplicateCandidateRelations = relations(duplicateCandidates, ({ one }) => ({
  student: one(students, { fields: [duplicateCandidates.studentId], references: [students.id] }),
  possibleStudent: one(students, {
    fields: [duplicateCandidates.possibleStudentId],
    references: [students.id],
  }),
}));

export const interventionRelations = relations(interventions, ({ one, many }) => ({
  student: one(students, { fields: [interventions.studentId], references: [students.id] }),
  assignee: one(users, { fields: [interventions.assignedTo], references: [users.id] }),
  creator: one(users, { fields: [interventions.createdBy], references: [users.id] }),
  followups: many(interventionFollowups),
}));

export const interventionFollowupRelations = relations(interventionFollowups, ({ one }) => ({
  intervention: one(interventions, {
    fields: [interventionFollowups.interventionId],
    references: [interventions.id],
  }),
  recorder: one(users, {
    fields: [interventionFollowups.recordedBy],
    references: [users.id],
  }),
}));

export const qrVerificationRelations = relations(qrVerifications, ({ one }) => ({
  student: one(students, { fields: [qrVerifications.studentId], references: [students.id] }),
  verifier: one(users, { fields: [qrVerifications.verifiedBy], references: [users.id] }),
}));

export const reportRelations = relations(reports, ({ one, many }) => ({
  generator: one(users, { fields: [reports.generatedBy], references: [users.id] }),
  exports: many(reportExports),
}));

export const reportExportRelations = relations(reportExports, ({ one }) => ({
  report: one(reports, { fields: [reportExports.reportId], references: [reports.id] }),
  generator: one(users, { fields: [reportExports.generatedBy], references: [users.id] }),
}));

export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const auditLogRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

/* -------------------------------------------------------------------------- */
/*  Inferred types                                                            */
/* -------------------------------------------------------------------------- */

export type RoleRow = typeof roles.$inferSelect;
export type PermissionRow = typeof permissions.$inferSelect;
export type RolePermissionRow = typeof rolePermissions.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type SchoolYear = typeof schoolYears.$inferSelect;
export type GradeLevel = typeof gradeLevels.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Guardian = typeof guardians.$inferSelect;
export type StudentEnrollment = typeof studentEnrollments.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type GradingPeriod = typeof gradingPeriods.$inferSelect;
export type StudentGrade = typeof studentGrades.$inferSelect;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type BehaviorCategory = typeof behaviorCategories.$inferSelect;
export type BehaviorRecord = typeof behaviorRecords.$inferSelect;
export type Assessment = typeof assessments.$inferSelect;
export type RecordVerification = typeof recordVerifications.$inferSelect;
export type DuplicateCandidate = typeof duplicateCandidates.$inferSelect;
export type Intervention = typeof interventions.$inferSelect;
export type InterventionFollowup = typeof interventionFollowups.$inferSelect;
export type QrVerification = typeof qrVerifications.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type ReportExport = typeof reportExports.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type SystemSetting = typeof systemSettings.$inferSelect;
