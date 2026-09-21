import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
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
/*  Organization                                                              */
/* -------------------------------------------------------------------------- */

export const barangays = sqliteTable(
  "barangays",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("barangays_name_uq").on(t.name)],
);

export const schools = sqliteTable(
  "schools",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    barangayId: text("barangay_id").references(() => barangays.id),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("schools_name_uq").on(t.name)],
);

/* -------------------------------------------------------------------------- */
/*  Users & sessions                                                          */
/* -------------------------------------------------------------------------- */

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    /** admin | lgu | school | barangay */
    role: text("role").notNull().default("barangay"),
    /** Scope: school users are limited to this school. */
    schoolId: text("school_id").references(() => schools.id),
    /** Scope: barangay users are limited to this barangay. */
    barangayId: text("barangay_id").references(() => barangays.id),
    isActive: bool("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
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
/*  Children                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Core child-mapping record. Current-state columns live here; the history of
 * workflow transitions lives in `validation_history`.
 */
export const children = sqliteTable(
  "children",
  {
    id: text("id").primaryKey(),
    /** Stable public identifier, e.g. CM-2026-000001. */
    childCode: text("child_code").notNull(),

    firstName: text("first_name").notNull(),
    middleName: text("middle_name"),
    lastName: text("last_name").notNull(),
    suffix: text("suffix"),
    birthDate: text("birth_date").notNull(), // ISO date YYYY-MM-DD
    /** male | female */
    sex: text("sex").notNull(),

    barangayId: text("barangay_id")
      .notNull()
      .references(() => barangays.id),
    addressDetails: text("address_details"),

    guardianName: text("guardian_name"),
    guardianContact: text("guardian_contact"),

    /** not_yet_enrolled | enrolled | out_of_school | als_learner */
    educationalStatus: text("educational_status").notNull().default("not_yet_enrolled"),
    schoolId: text("school_id").references(() => schools.id),
    gradeLevel: text("grade_level"),
    schoolYear: text("school_year"),

    /** participating | not_participating | unknown */
    eccdStatus: text("eccd_status").notNull().default("unknown"),
    eccdCenter: text("eccd_center"),
    eccdNonParticipationReason: text("eccd_non_participation_reason"),

    /** none | with_disability | suspected */
    disabilityStatus: text("disability_status").notNull().default("none"),
    disabilityType: text("disability_type"),
    disabilitySupportRequired: text("disability_support_required"),
    disabilitySupportProvided: text("disability_support_provided"),
    disabilityReferral: text("disability_referral"),

    /** draft | submitted | pending_validation | needs_correction | resubmitted | verified */
    validationStatus: text("validation_status").notNull().default("draft"),
    /** none | potential | confirmed_duplicate | resolved */
    duplicateStatus: text("duplicate_status").notNull().default("none"),

    notes: text("notes"),

    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    submittedAt: timestamp("submitted_at"),
    verifiedBy: text("verified_by").references(() => users.id),
    verifiedAt: timestamp("verified_at"),
    validationNotes: text("validation_notes"),

    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("children_code_uq").on(t.childCode),
    index("children_name_idx").on(t.lastName, t.firstName),
    index("children_birth_idx").on(t.birthDate),
    index("children_validation_idx").on(t.validationStatus),
    index("children_barangay_idx").on(t.barangayId),
    index("children_school_idx").on(t.schoolId),
  ],
);

export const validationHistory = sqliteTable(
  "validation_history",
  {
    id: text("id").primaryKey(),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    /** created | submitted | verified | returned | resubmitted | updated */
    action: text("action").notNull(),
    notes: text("notes"),
    performedBy: text("performed_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [index("validation_history_child_idx").on(t.childId, t.createdAt)],
);

/* -------------------------------------------------------------------------- */
/*  Duplicate detection                                                       */
/* -------------------------------------------------------------------------- */

export const duplicateCandidates = sqliteTable(
  "duplicate_candidates",
  {
    id: text("id").primaryKey(),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    /** JSON array of matched field names, e.g. ["name","birth_date","barangay"] */
    matchReasons: text("match_reasons").notNull().default("[]"),
    /** potential | confirmed | dismissed | resolved */
    status: text("status").notNull().default("potential"),
    reviewedBy: text("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at"),
    reviewNotes: text("review_notes"),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("duplicate_pair_uq").on(t.childId, t.candidateId),
    index("duplicate_status_idx").on(t.status),
  ],
);

/* -------------------------------------------------------------------------- */
/*  QR verification                                                           */
/* -------------------------------------------------------------------------- */

export const qrTokens = sqliteTable(
  "qr_tokens",
  {
    id: text("id").primaryKey(),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    isActive: bool("is_active").notNull().default(true),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at"),
    scanCount: integer("scan_count").notNull().default(0),
    lastScannedAt: timestamp("last_scanned_at"),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("qr_tokens_token_uq").on(t.token),
    index("qr_tokens_child_idx").on(t.childId),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Monitoring                                                                */
/* -------------------------------------------------------------------------- */

export const monitoringFollowups = sqliteTable(
  "monitoring_followups",
  {
    id: text("id").primaryKey(),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    /** osy | eccd | disability | educational | intervention */
    category: text("category").notNull(),
    /** open | in_progress | follow_up | resolved */
    status: text("status").notNull().default("open"),
    notes: text("notes"),
    followupDate: text("followup_date"),
    assignedTo: text("assigned_to").references(() => users.id),
    resolvedAt: timestamp("resolved_at"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
    updatedAt: timestamp("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    index("monitoring_category_idx").on(t.category, t.status),
    index("monitoring_child_idx").on(t.childId),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Reports                                                                   */
/* -------------------------------------------------------------------------- */

export const reports = sqliteTable(
  "reports",
  {
    id: text("id").primaryKey(),
    /** school | barangay | municipal | summary | planning | monitoring */
    type: text("type").notNull(),
    title: text("title").notNull(),
    filters: text("filters").notNull().default("{}"),
    generatedBy: text("generated_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [index("reports_created_idx").on(t.createdAt)],
);

/* -------------------------------------------------------------------------- */
/*  Audit & notifications                                                     */
/* -------------------------------------------------------------------------- */

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    userRole: text("user_role"),
    /** Dotted action name, e.g. child.create, auth.login, report.export */
    action: text("action").notNull(),
    /** Logical entity, e.g. child, user, report, qr */
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    /** success | denied | error */
    result: text("result").notNull().default("success"),
    metadata: text("metadata"),
    ip: text("ip"),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    index("audit_created_idx").on(t.createdAt),
    index("audit_user_idx").on(t.userId),
  ],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    isRead: bool("is_read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql`(unixepoch())`),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.isRead)],
);

/* -------------------------------------------------------------------------- */
/*  Relations (for typed relational queries)                                  */
/* -------------------------------------------------------------------------- */

export const barangayRelations = relations(barangays, ({ many }) => ({
  children: many(children),
  users: many(users),
}));

export const schoolRelations = relations(schools, ({ one, many }) => ({
  barangay: one(barangays, {
    fields: [schools.barangayId],
    references: [barangays.id],
  }),
  children: many(children),
}));

export const childRelations = relations(children, ({ one, many }) => ({
  barangay: one(barangays, {
    fields: [children.barangayId],
    references: [barangays.id],
  }),
  school: one(schools, {
    fields: [children.schoolId],
    references: [schools.id],
  }),
  createdByUser: one(users, {
    fields: [children.createdBy],
    references: [users.id],
  }),
  history: many(validationHistory),
  duplicates: many(duplicateCandidates),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  barangay: one(barangays, {
    fields: [users.barangayId],
    references: [barangays.id],
  }),
  school: one(schools, {
    fields: [users.schoolId],
    references: [schools.id],
  }),
  sessions: many(sessions),
}));

/* -------------------------------------------------------------------------- */
/*  Inferred types                                                            */
/* -------------------------------------------------------------------------- */

export type Barangay = typeof barangays.$inferSelect;
export type School = typeof schools.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Child = typeof children.$inferSelect;
export type NewChild = typeof children.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type ValidationEvent = typeof validationHistory.$inferSelect;
export type DuplicateCandidate = typeof duplicateCandidates.$inferSelect;
export type QrToken = typeof qrTokens.$inferSelect;
export type MonitoringFollowup = typeof monitoringFollowups.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
