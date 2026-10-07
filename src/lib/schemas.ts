import { z } from "zod";
import {
  ASSESSMENT_DOMAINS,
  ATTENDANCE_STATUSES,
  BEHAVIOR_RECORD_STATUSES,
  BEHAVIOR_SEVERITIES,
  ENROLLMENT_STATUSES,
  FOLLOWUP_STATUSES,
  INTERVENTION_STATUSES,
  ROLES,
  SEXES,
} from "./constants";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");

/**
 * Birth dates of high-school students. The school serves Grades 7–12, so a
 * realistic window is ~10–25 years old at entry; anything before 1990 is a
 * data-entry error and anything in the future is impossible.
 */
const notTooOld = (date: string): boolean => {
  const year = Number(date.slice(0, 4));
  return year >= 1990 && year <= new Date().getFullYear() + 1;
};

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

/* -------------------------------------------------------------------------- */
/*  Student form (client + server)                                            */
/* -------------------------------------------------------------------------- */

/**
 * Core student record. Academic placement (enrollment in a grade level /
 * section for a school year) is a separate flow recorded in
 * `student_enrollments`; guardians are created alongside the student.
 */
export const studentFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  middleName: optionalText(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  suffix: optionalText(10),
  birthDate: isoDate.refine(notTooOld, "Enter a realistic birth date"),
  sex: z.enum(SEXES, { message: "Select a sex" }),
  contactNumber: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+()\- ]*$/, "Contact number may only contain digits and + ( ) -")
    .optional()
    .or(z.literal("")),
  address: optionalText(300),

  // Primary guardian (created with the student; can be updated later)
  guardianFirstName: optionalText(60),
  guardianMiddleName: optionalText(60),
  guardianLastName: optionalText(60),
  guardianRelationship: z
    .enum(["mother", "father", "guardian"], { message: "Select a relationship" })
    .optional()
    .or(z.literal("")),
  guardianContactNumber: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+()\- ]*$/, "Contact number may only contain digits and + ( ) -")
    .optional()
    .or(z.literal("")),
  guardianEmail: z.email("Enter a valid email address").max(120).optional().or(z.literal("")),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;

/* -------------------------------------------------------------------------- */
/*  Auth & users                                                              */
/* -------------------------------------------------------------------------- */

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").max(120),
  password: z.string().min(1, "Password is required").max(128),
});

export const userFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  middleName: optionalText(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.email("Enter a valid email address").max(120),
  roleId: z.enum(
    ["role-admin", "role-school-admin", "role-teacher", "role-records", "role-guidance"],
    { message: "Select a role" },
  ),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+()\- ]*$/, "Phone may only contain digits and + ( ) -")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().optional().default(true),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(128),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(128),
});

/* -------------------------------------------------------------------------- */
/*  Verification & duplicates                                                 */
/* -------------------------------------------------------------------------- */

export const verificationReviewSchema = z.object({
  studentId: z.string().min(1),
  decision: z.enum(["approved", "needs_correction", "rejected"]),
  remarks: optionalText(500),
});

export const duplicateReviewSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["confirmed_duplicate", "not_duplicate", "dismissed"]),
  notes: optionalText(500),
});

/* -------------------------------------------------------------------------- */
/*  Student development (assessments, behavior, interventions)                 */
/* -------------------------------------------------------------------------- */

export const assessmentFormSchema = z.object({
  studentId: z.string().min(1),
  domain: z.enum(ASSESSMENT_DOMAINS, { message: "Select a domain" }),
  assessmentType: optionalText(60),
  skillArea: optionalText(60),
  date: isoDate,
  level: optionalText(40),
  score: z.coerce.number().min(0).max(100).optional(),
  notes: optionalText(300),
});

export const behaviorFormSchema = z.object({
  studentId: z.string().min(1),
  categoryId: z.string().min(1, "Select a category"),
  date: isoDate,
  description: z.string().trim().min(1, "Description is required").max(500),
  severity: z.enum(BEHAVIOR_SEVERITIES).optional().or(z.literal("")),
  followUp: optionalText(300),
  status: z.enum(BEHAVIOR_RECORD_STATUSES).default("open"),
});

export const interventionFormSchema = z.object({
  studentId: z.string().min(1),
  interventionType: z.string().trim().min(1, "Intervention type is required").max(60),
  description: z.string().trim().min(1, "Description is required").max(500),
  status: z.enum(INTERVENTION_STATUSES).default("planned"),
  startDate: isoDate.optional().or(z.literal("")),
  targetDate: isoDate.optional().or(z.literal("")),
  outcome: optionalText(500),
});

export const followupFormSchema = z.object({
  interventionId: z.string().min(1),
  followUpDate: isoDate,
  status: z.enum(FOLLOWUP_STATUSES),
  notes: optionalText(500),
});

/* -------------------------------------------------------------------------- */
/*  Enrollment, grades, attendance                                            */
/* -------------------------------------------------------------------------- */

export const enrollmentFormSchema = z.object({
  studentId: z.string().min(1),
  schoolYearId: z.string().min(1, "Select a school year"),
  gradeLevelId: z.string().min(1, "Select a grade level"),
  sectionId: z.string().min(1, "Select a section"),
  status: z.enum(ENROLLMENT_STATUSES).default("active"),
  enrollmentDate: isoDate.optional().or(z.literal("")),
});

export const gradeFormSchema = z.object({
  enrollmentId: z.string().min(1),
  subjectId: z.string().min(1, "Select a subject"),
  gradingPeriodId: z.string().min(1, "Select a grading period"),
  grade: z.coerce
    .number()
    .min(60, "Grades below 60 are invalid")
    .max(100, "Grades above 100 are invalid"),
  remarks: optionalText(200),
});

export const attendanceFormSchema = z.object({
  enrollmentId: z.string().min(1),
  date: isoDate,
  status: z.enum(ATTENDANCE_STATUSES, { message: "Select an attendance status" }),
  remarks: optionalText(200),
});

/* -------------------------------------------------------------------------- */
/*  Registry query (server-side parsing of search params)                      */
/* -------------------------------------------------------------------------- */

export const studentQuerySchema = z.object({
  q: z.string().trim().max(100).optional().or(z.literal("")),
  status: z.string().optional().or(z.literal("")),
  lifecycle: z.string().optional().or(z.literal("")),
  sex: z.string().optional().or(z.literal("")),
  gradeLevel: z.string().optional().or(z.literal("")),
  sectionId: z.string().optional().or(z.literal("")),
  sort: z.enum(["name", "recent", "oldest"]).default("recent"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});

export type StudentQueryParsed = z.infer<typeof studentQuerySchema>;

/** All valid roles, re-exported for form components. */
export const VALID_ROLE_IDS = ROLES;
