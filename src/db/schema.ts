import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
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
/*  Location / reference data                                                 */
/* -------------------------------------------------------------------------- */

export const municipalities = sqliteTable(
  "municipalities",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    province: text("province").notNull(),
    region: text("region").notNull(),
    shortName: text("short_name"),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
);

export const barangays = sqliteTable(
  "barangays",
  {
    id: text("id").primaryKey(),
    municipalityId: text("municipality_id").references(() => municipalities.id),
    name: text("name").notNull(),
    code: text("code"),
    isActive: bool("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("barangays_name_uq").on(t.name),
    uniqueIndex("barangays_code_uq").on(t.code),
    index("barangays_municipality_idx").on(t.municipalityId),
  ],
);

export const schools = sqliteTable(
  "schools",
  {
    id: text("id").primaryKey(),
    barangayId: text("barangay_id").references(() => barangays.id),
    name: text("name").notNull(),
    schoolCode: text("school_code"),
    /** elementary | high_school | integrated | college */
    schoolType: text("school_type").notNull().default("elementary"),
    address: text("address"),
    isActive: bool("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("schools_name_uq").on(t.name),
    uniqueIndex("schools_code_uq").on(t.schoolCode),
    index("schools_barangay_idx").on(t.barangayId),
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
    barangayId: text("barangay_id").references(() => barangays.id),
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
    index("users_barangay_idx").on(t.barangayId),
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
/*  Children (central entity)                                                 */
/* -------------------------------------------------------------------------- */

export const children = sqliteTable(
  "children",
  {
    id: text("id").primaryKey(),
    /** Application-generated stable public identifier, e.g. CM-2026-000001. */
    childCode: text("child_code").notNull(),

    firstName: text("first_name").notNull(),
    middleName: text("middle_name"),
    lastName: text("last_name").notNull(),
    suffix: text("suffix"),
    birthDate: text("birth_date").notNull(), // ISO date YYYY-MM-DD
    /** male | female */
    sex: text("sex").notNull(),
    /** single | married | divorced | widowed | null (children are usually single) */
    civilStatus: text("civil_status"),
    birthPlace: text("birth_place"),

    barangayId: text("barangay_id")
      .notNull()
      .references(() => barangays.id),

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
    uniqueIndex("children_code_uq").on(t.childCode),
    index("children_last_name_idx").on(t.lastName),
    index("children_first_name_idx").on(t.firstName),
    index("children_birth_idx").on(t.birthDate),
    index("children_barangay_idx").on(t.barangayId),
    index("children_record_status_idx").on(t.recordStatus),
    index("children_status_idx").on(t.status),
    index("children_created_idx").on(t.createdAt),
  ],
);

export const childAddresses = sqliteTable(
  "child_addresses",
  {
    id: text("id").primaryKey(),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    barangayId: text("barangay_id")
      .notNull()
      .references(() => barangays.id),
    householdAddress: text("household_address").notNull(),
    sitio: text("sitio"),
    isCurrent: bool("is_current").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    index("child_addresses_child_idx").on(t.childId),
    index("child_addresses_barangay_idx").on(t.barangayId),
  ],
);

export const childEducation = sqliteTable(
  "child_education",
  {
    id: text("id").primaryKey(),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    schoolId: text("school_id").references(() => schools.id),
    /** enrolled | out_of_school | not_yet_in_school | graduated | unknown */
    educationStatus: text("education_status").notNull(),
    gradeLevel: text("grade_level"),
    schoolYear: text("school_year"),
    enrollmentStatus: text("enrollment_status"),
    isCurrent: bool("is_current").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    index("child_education_child_idx").on(t.childId),
    index("child_education_school_idx").on(t.schoolId),
    index("child_education_status_idx").on(t.educationStatus),
    index("child_education_sy_idx").on(t.schoolYear),
  ],
);

export const childEccd = sqliteTable(
  "child_eccd",
  {
    id: text("id").primaryKey(),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    /** participating | not_participating | unknown */
    participationStatus: text("participation_status").notNull(),
    programName: text("program_name"),
    provider: text("provider"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    remarks: text("remarks"),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [index("child_eccd_child_idx").on(t.childId)],
);

export const childDisabilities = sqliteTable(
  "child_disabilities",
  {
    id: text("id").primaryKey(),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    hasDisability: bool("has_disability").notNull().default(false),
    disabilityType: text("disability_type"),
    description: text("description"),
    supportNeeded: text("support_needed"),
    /** none | assessment | support | referred | ongoing | completed */
    assistanceStatus: text("assistance_status"),
    verified: bool("verified").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [index("child_disabilities_child_idx").on(t.childId)],
);

/* -------------------------------------------------------------------------- */
/*  Validation                                                                */
/* -------------------------------------------------------------------------- */

export const childValidations = sqliteTable(
  "child_validations",
  {
    id: text("id").primaryKey(),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
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
    index("child_validations_child_idx").on(t.childId),
    index("child_validations_status_idx").on(t.status),
    index("child_validations_submitted_idx").on(t.submittedAt),
  ],
);

export const childDuplicateCandidates = sqliteTable(
  "child_duplicate_candidates",
  {
    id: text("id").primaryKey(),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    possibleChildId: text("possible_child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    matchScore: integer("match_score"),
    matchReason: text("match_reason"),
    /** pending | confirmed_duplicate | not_duplicate | dismissed */
    status: text("status").notNull().default("pending"),
    reviewedBy: text("reviewed_by").references(() => users.id),
    reviewNotes: text("review_notes"),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("duplicate_pair_uq").on(t.childId, t.possibleChildId),
    index("duplicate_status_idx").on(t.status),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Monitoring                                                                */
/* -------------------------------------------------------------------------- */

export const childMonitoring = sqliteTable(
  "child_monitoring",
  {
    id: text("id").primaryKey(),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    /** education | out_of_school_youth | eccd | disability | general */
    monitoringType: text("monitoring_type").notNull(),
    /** open | in_progress | resolved | closed */
    status: text("status").notNull().default("open"),
    observedAt: timestamp("observed_at").notNull(),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => users.id),
    remarks: text("remarks"),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    index("child_monitoring_child_idx").on(t.childId),
    index("child_monitoring_type_idx").on(t.monitoringType),
    index("child_monitoring_observed_idx").on(t.observedAt),
  ],
);

export const interventions = sqliteTable(
  "interventions",
  {
    id: text("id").primaryKey(),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    interventionType: text("intervention_type").notNull(),
    description: text("description").notNull(),
    /** planned | ongoing | completed | cancelled */
    status: text("status").notNull().default("planned"),
    /** low | medium | high | urgent */
    priority: text("priority"),
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
    index("interventions_child_idx").on(t.childId),
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
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
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
    index("qr_verifications_child_idx").on(t.childId),
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
    /** child_registry | educational_status | out_of_school_youth | eccd |
     *  disability | intervention | barangay_summary | municipal_summary */
    reportType: text("report_type").notNull(),
    generatedBy: text("generated_by")
      .notNull()
      .references(() => users.id),
    /** municipality | barangay | school */
    scope: text("scope").notNull().default("municipality"),
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
/*  System                                                                    */
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
    /** Append-only. Dotted action name, e.g. child.create, auth.login */
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

export const municipalityRelations = relations(municipalities, ({ many }) => ({
  barangays: many(barangays),
}));

export const barangayRelations = relations(barangays, ({ one, many }) => ({
  municipality: one(municipalities, {
    fields: [barangays.municipalityId],
    references: [municipalities.id],
  }),
  users: many(users),
  schools: many(schools),
  children: many(children),
}));

export const schoolRelations = relations(schools, ({ one, many }) => ({
  barangay: one(barangays, {
    fields: [schools.barangayId],
    references: [barangays.id],
  }),
  educationRecords: many(childEducation),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  barangay: one(barangays, {
    fields: [users.barangayId],
    references: [barangays.id],
  }),
  sessions: many(sessions),
}));

export const childRelations = relations(children, ({ one, many }) => ({
  barangay: one(barangays, {
    fields: [children.barangayId],
    references: [barangays.id],
  }),
  createdByUser: one(users, {
    fields: [children.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [children.updatedBy],
    references: [users.id],
  }),
  addresses: many(childAddresses),
  education: many(childEducation),
  eccd: many(childEccd),
  disabilities: many(childDisabilities),
  validations: many(childValidations),
  monitoring: many(childMonitoring),
  interventions: many(interventions),
}));

export const childAddressRelations = relations(childAddresses, ({ one }) => ({
  child: one(children, { fields: [childAddresses.childId], references: [children.id] }),
  barangay: one(barangays, {
    fields: [childAddresses.barangayId],
    references: [barangays.id],
  }),
}));

export const childEducationRelations = relations(childEducation, ({ one }) => ({
  child: one(children, { fields: [childEducation.childId], references: [children.id] }),
  school: one(schools, { fields: [childEducation.schoolId], references: [schools.id] }),
}));

export const childEccdRelations = relations(childEccd, ({ one }) => ({
  child: one(children, { fields: [childEccd.childId], references: [children.id] }),
}));

export const childDisabilityRelations = relations(childDisabilities, ({ one }) => ({
  child: one(children, {
    fields: [childDisabilities.childId],
    references: [children.id],
  }),
}));

export const childValidationRelations = relations(childValidations, ({ one }) => ({
  child: one(children, { fields: [childValidations.childId], references: [children.id] }),
  submitter: one(users, { fields: [childValidations.submittedBy], references: [users.id] }),
  reviewer: one(users, { fields: [childValidations.reviewedBy], references: [users.id] }),
}));

export const childMonitoringRelations = relations(childMonitoring, ({ one }) => ({
  child: one(children, { fields: [childMonitoring.childId], references: [children.id] }),
  recorder: one(users, { fields: [childMonitoring.recordedBy], references: [users.id] }),
}));

export const interventionRelations = relations(interventions, ({ one, many }) => ({
  child: one(children, { fields: [interventions.childId], references: [children.id] }),
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
  child: one(children, { fields: [qrVerifications.childId], references: [children.id] }),
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
export type Municipality = typeof municipalities.$inferSelect;
export type Barangay = typeof barangays.$inferSelect;
export type School = typeof schools.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Child = typeof children.$inferSelect;
export type NewChild = typeof children.$inferInsert;
export type ChildAddress = typeof childAddresses.$inferSelect;
export type ChildEducationRow = typeof childEducation.$inferSelect;
export type ChildEccdRow = typeof childEccd.$inferSelect;
export type ChildDisability = typeof childDisabilities.$inferSelect;
export type ChildValidation = typeof childValidations.$inferSelect;
export type ChildDuplicateCandidate = typeof childDuplicateCandidates.$inferSelect;
export type ChildMonitoringRow = typeof childMonitoring.$inferSelect;
export type Intervention = typeof interventions.$inferSelect;
export type InterventionFollowup = typeof interventionFollowups.$inferSelect;
export type QrVerification = typeof qrVerifications.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type ReportExport = typeof reportExports.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type SystemSetting = typeof systemSettings.$inferSelect;
